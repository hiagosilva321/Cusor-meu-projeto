import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildCheckoutUrl,
  clearStoredAssignedNumberId,
  getOrCreateVisitorId,
  getStoredAssignedNumberId,
  getStoredReferralSource,
  persistAssignedWhatsApp,
  persistReferralSource,
  toReferralSource,
} from '@/lib/whatsapp-sticky';

interface WhatsAppNumber {
  id: string;
  number: string;
  label: string;
  peso_distribuicao: number;
  click_count: number;
  order_index: number;
}

interface WeightedClickResult {
  number_id: string;
  number_value: string;
}

interface WhatsAppContextType {
  assignedNumber: string;
  assignedNumberId: string;
  assignedReferralSource: string;
  visitorId: string;
  getWhatsAppUrl: (message?: string) => string;
  getCheckoutUrl: () => string;
  rememberReferralSource: (referralSource?: string | null) => void;
  trackClick: (event?: React.MouseEvent<HTMLAnchorElement>, section?: string) => Promise<void>;
  loading: boolean;
  available: boolean;
}

const WhatsAppContext = createContext<WhatsAppContextType | null>(null);
const DEFAULT_MESSAGE = 'Olá quero pedir uma caçamba';

/**
 * Seleciona o próximo número por rotação fixa.
 * rotationSize = a cada N cliques, muda pro próximo número.
 * Ex: rotationSize=5, 3 números → clicks 1-5=chip1, 6-10=chip2, 11-15=chip3, 16-20=chip1...
 */
function selectByRotation(numbers: WhatsAppNumber[], rotationSize: number): WhatsAppNumber {
  // Total de cliques globais
  const totalClicks = numbers.reduce((sum, n) => sum + n.click_count, 0);
  // Qual "slot" estamos (0-indexed)
  const cycleSize = rotationSize * numbers.length;
  const positionInCycle = totalClicks % cycleSize;
  const numberIndex = Math.floor(positionInCycle / rotationSize);
  // Garante que o index está dentro do range
  return numbers[Math.min(numberIndex, numbers.length - 1)];
}

function buildWhatsAppUrl(number: string, message?: string) {
  const normalizedNumber = number.replace(/\D/g, '');
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message || DEFAULT_MESSAGE)}`;
}

function getMessageFromHref(href?: string): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).searchParams.get('text') || undefined;
  } catch {
    return undefined;
  }
}

function findNumberByReferralSource(numbers: WhatsAppNumber[], referralSource: string) {
  return numbers.find((number) => toReferralSource(number.label) === referralSource) || null;
}

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedNumberId, setAssignedNumberId] = useState<string>(() => getStoredAssignedNumberId());
  const [assignedReferralSource, setAssignedReferralSource] = useState<string>(() => getStoredReferralSource());
  const [rotationSize, setRotationSize] = useState(5);
  const visitorId = useMemo(() => getOrCreateVisitorId(), []);
  const numbersRef = useRef<WhatsAppNumber[]>([]);

  const loadActiveNumbers = useCallback(async () => {
    try {
      const [numbersRes, settingsRes] = await Promise.all([
        supabase
          .from('whatsapp_numbers')
          .select('id, number, label, peso_distribuicao, click_count, order_index')
          .eq('active', true)
          .order('order_index'),
        supabase
          .from('site_settings')
          .select('whatsapp_rotation_size')
          .limit(1)
          .single(),
      ]);

      if (numbersRes.error) throw numbersRes.error;
      setNumbers((numbersRes.data || []) as WhatsAppNumber[]);

      if (settingsRes.data?.whatsapp_rotation_size) {
        setRotationSize(settingsRes.data.whatsapp_rotation_size);
      }
    } catch (err) {
      console.error('WhatsApp init error:', err);
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActiveNumbers();

    const channel = supabase
      .channel('whatsapp-numbers-active-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_numbers' },
        () => {
          void loadActiveNumbers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          void loadActiveNumbers();
        }
      )
      .subscribe();

    const pollId = window.setInterval(() => {
      void loadActiveNumbers();
    }, 15000);

    return () => {
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [loadActiveNumbers]);

  useEffect(() => {
    numbersRef.current = numbers;

    if (assignedNumberId) {
      const stillActive = numbers.some((number) => number.id === assignedNumberId);
      if (!stillActive) {
        clearStoredAssignedNumberId();
        setAssignedNumberId('');
      }
      return;
    }

    if (!assignedReferralSource) return;

    const assignedByReferral = findNumberByReferralSource(numbers, assignedReferralSource);
    if (assignedByReferral) {
      persistAssignedWhatsApp(assignedByReferral.id, assignedReferralSource);
      setAssignedNumberId(assignedByReferral.id);
    }
  }, [numbers, assignedNumberId, assignedReferralSource]);

  const selectedNumber = useMemo(() => {
    if (numbers.length === 0) return null;

    if (assignedNumberId) {
      const assigned = numbers.find((number) => number.id === assignedNumberId);
      if (assigned) return assigned;
    }

    if (assignedReferralSource) {
      const assignedByReferral = findNumberByReferralSource(numbers, assignedReferralSource);
      if (assignedByReferral) return assignedByReferral;
    }

    return selectByRotation(numbers, rotationSize);
  }, [numbers, assignedNumberId, assignedReferralSource, rotationSize]);

  const assignedNumber = selectedNumber?.number || '';
  const available = numbers.length > 0;
  const effectiveReferralSource = assignedReferralSource || (selectedNumber ? toReferralSource(selectedNumber.label) : '');

  useEffect(() => {
    if (!selectedNumber || assignedReferralSource || !effectiveReferralSource) return;

    persistReferralSource(effectiveReferralSource);
    setAssignedReferralSource(effectiveReferralSource);
  }, [assignedReferralSource, effectiveReferralSource, selectedNumber]);

  const getWhatsAppUrl = useCallback(
    (message?: string) => {
      if (!selectedNumber) return '';
      return buildWhatsAppUrl(selectedNumber.number, message);
    },
    [selectedNumber]
  );

  const getCheckoutUrl = useCallback(() => buildCheckoutUrl(effectiveReferralSource), [effectiveReferralSource]);

  const rememberReferralSource = useCallback((referralSource?: string | null) => {
    if (!referralSource) return;
    persistReferralSource(referralSource);
    setAssignedReferralSource(referralSource);
  }, []);

  const trackClick = useCallback(
    async (event?: React.MouseEvent<HTMLAnchorElement>, section?: string) => {
      event?.preventDefault();

      const customMessage = getMessageFromHref(event?.currentTarget?.href);

      // Seção explícita para analytics precisos (ex: "hero", "tamanhos", "flutuante")
      const pageUrl = section
        ? `${window.location.origin}${window.location.pathname}#${section}`
        : window.location.href;

      try {
        const { data, error } = await supabase.rpc('register_weighted_whatsapp_click', {
          p_visitor_id: visitorId,
          p_page_url: pageUrl,
        });

        if (error) throw error;

        const selected = (Array.isArray(data) ? data[0] : data) as WeightedClickResult | null;
        if (!selected?.number_id || !selected?.number_value) return;

        const selectedMeta = numbersRef.current.find((number) => number.id === selected.number_id);
        const selectedReferralSource = selectedMeta ? toReferralSource(selectedMeta.label) : '';
        persistAssignedWhatsApp(selected.number_id, selectedReferralSource);
        setAssignedNumberId(selected.number_id);
        if (selectedReferralSource) {
          setAssignedReferralSource(selectedReferralSource);
        }

        setNumbers((prev) =>
          prev.map((item) =>
            item.id === selected.number_id ? { ...item, click_count: item.click_count + 1 } : item
          )
        );

        window.open(buildWhatsAppUrl(selected.number_value, customMessage), '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Click tracking error:', err);

        const fallbackPool = numbersRef.current;
        if (fallbackPool.length === 0) return;

        const fallbackSelected = assignedNumberId
          ? fallbackPool.find((number) => number.id === assignedNumberId) || selectByRotation(fallbackPool, rotationSize)
          : selectByRotation(fallbackPool, rotationSize);

        if (!fallbackSelected) return;

        const fallbackReferralSource = toReferralSource(fallbackSelected.label);
        persistAssignedWhatsApp(fallbackSelected.id, fallbackReferralSource);
        setAssignedNumberId(fallbackSelected.id);
        setAssignedReferralSource(fallbackReferralSource);

        window.open(buildWhatsAppUrl(fallbackSelected.number, customMessage), '_blank', 'noopener,noreferrer');

        try {
          await supabase.rpc('register_whatsapp_click', {
            p_number_id: fallbackSelected.id,
            p_visitor_id: visitorId,
            p_page_url: pageUrl,
          });

          setNumbers((prev) =>
            prev.map((item) =>
              item.id === fallbackSelected.id ? { ...item, click_count: item.click_count + 1 } : item
            )
          );
        } catch (fallbackError) {
          console.error('Fallback click tracking error:', fallbackError);
        }
      }
    },
    [assignedNumberId, rotationSize, visitorId]
  );

  return (
    <WhatsAppContext.Provider
      value={{
        assignedNumber,
        assignedNumberId: selectedNumber?.id || '',
        assignedReferralSource: effectiveReferralSource,
        visitorId,
        getWhatsAppUrl,
        getCheckoutUrl,
        rememberReferralSource,
        trackClick,
        loading,
        available,
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const ctx = useContext(WhatsAppContext);
  if (!ctx) throw new Error('useWhatsApp must be used within WhatsAppProvider');
  return ctx;
}
