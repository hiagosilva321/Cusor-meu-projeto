import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  visitorId: string;
  getWhatsAppUrl: (message?: string) => string;
  trackClick: (event?: React.MouseEvent<HTMLAnchorElement>) => Promise<void>;
  loading: boolean;
  available: boolean;
}

const WhatsAppContext = createContext<WhatsAppContextType | null>(null);

const VISITOR_ID_KEY = 'cacamba_visitor_id';
const ASSIGNED_NUMBER_ID_KEY = 'cacamba_assigned_whatsapp_number_id';
const DEFAULT_MESSAGE = 'Olá quero pedir uma caçamba';
/** Quando não há linhas em whatsapp_numbers, usa site_settings.whatsapp_principal */
const FALLBACK_WHATSAPP_ID = '__site_settings_principal__';

function normalizePrincipalForWa(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? raw.trim() : null;
}

function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

function getStoredAssignedNumberId(): string {
  return localStorage.getItem(ASSIGNED_NUMBER_ID_KEY) || '';
}

function selectByWeight(numbers: WhatsAppNumber[]): WhatsAppNumber {
  let best = numbers[0];
  let bestRatio = best.click_count / Math.max(best.peso_distribuicao || 1, 1);

  for (let i = 1; i < numbers.length; i++) {
    const candidate = numbers[i];
    const ratio = candidate.click_count / Math.max(candidate.peso_distribuicao || 1, 1);
    if (ratio < bestRatio || (ratio === bestRatio && candidate.order_index < best.order_index)) {
      bestRatio = ratio;
      best = candidate;
    }
  }

  return best;
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

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [principalFallback, setPrincipalFallback] = useState<string | null>(null);
  const [rotationActive, setRotationActive] = useState(true);
  const [peeked, setPeeked] = useState<{ id: string; number: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignedNumberId, setAssignedNumberId] = useState<string>(() => getStoredAssignedNumberId());
  const visitorId = useMemo(() => getOrCreateVisitorId(), []);
  const numbersRef = useRef<WhatsAppNumber[]>([]);
  const rotationActiveRef = useRef(true);

  useEffect(() => {
    rotationActiveRef.current = rotationActive;
  }, [rotationActive]);

  const loadActiveNumbers = useCallback(async () => {
    try {
      const [numbersRes, settingsTry] = await Promise.all([
        supabase
          .from('whatsapp_numbers')
          .select('id, number, label, peso_distribuicao, click_count, order_index')
          .eq('active', true)
          .order('order_index'),
        supabase
          .from('site_settings')
          .select('whatsapp_principal, whatsapp_rotacao_ativa')
          .limit(1)
          .maybeSingle(),
      ]);

      if (numbersRes.error) throw numbersRes.error;
      setNumbers((numbersRes.data || []) as WhatsAppNumber[]);

      let settingsRes = settingsTry;
      if (settingsTry.error) {
        settingsRes = await supabase
          .from('site_settings')
          .select('whatsapp_principal')
          .limit(1)
          .maybeSingle();
        if (!settingsRes.error && settingsRes.data) {
          const principal = normalizePrincipalForWa(settingsRes.data.whatsapp_principal ?? null);
          setPrincipalFallback(principal);
          setRotationActive(false);
        }
      } else if (settingsRes.data) {
        const principal = normalizePrincipalForWa(settingsRes.data.whatsapp_principal ?? null);
        setPrincipalFallback(principal);
        setRotationActive(settingsRes.data.whatsapp_rotacao_ativa !== false);
      }
    } catch (err) {
      console.error('WhatsApp init error:', err);
      setNumbers([]);
      setPrincipalFallback(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchPeek = useCallback(async () => {
    if (numbersRef.current.length === 0 || !rotationActiveRef.current) {
      setPeeked(null);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('peek_next_whatsapp_number', {
        p_visitor_id: visitorId,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { number_id?: string; number_value?: string }
        | null
        | undefined;
      if (row?.number_id && row?.number_value) {
        setPeeked({ id: row.number_id, number: row.number_value });
      } else {
        setPeeked(null);
      }
    } catch (e) {
      console.warn('peek_next_whatsapp_number:', e);
      setPeeked(null);
    }
  }, [visitorId]);

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

    if (!assignedNumberId) return;

    const stillActive = numbers.some((number) => number.id === assignedNumberId);
    if (!stillActive) {
      localStorage.removeItem(ASSIGNED_NUMBER_ID_KEY);
      setAssignedNumberId('');
    }
  }, [numbers, assignedNumberId]);

  useEffect(() => {
    if (!rotationActive) {
      setPeeked(null);
      return;
    }
    void refetchPeek();
  }, [numbers, rotationActive, visitorId, refetchPeek]);

  const selectedNumber = useMemo((): WhatsAppNumber | null => {
    if (numbers.length > 0) {
      if (rotationActive && peeked) {
        const match = numbers.find((n) => n.id === peeked.id);
        if (match) return match;
        return {
          id: peeked.id,
          number: peeked.number,
          label: '',
          peso_distribuicao: 1,
          click_count: 0,
          order_index: 0,
        };
      }
      if (assignedNumberId) {
        const assigned = numbers.find((number) => number.id === assignedNumberId);
        if (assigned) return assigned;
      }
      return selectByWeight(numbers);
    }

    if (principalFallback) {
      return {
        id: FALLBACK_WHATSAPP_ID,
        number: principalFallback,
        label: 'Principal',
        peso_distribuicao: 1,
        click_count: 0,
        order_index: 0,
      };
    }

    return null;
  }, [numbers, assignedNumberId, principalFallback, rotationActive, peeked]);

  const assignedNumber = selectedNumber?.number || '';
  const available = numbers.length > 0 || Boolean(principalFallback);

  const getWhatsAppUrl = useCallback(
    (message?: string) => {
      if (!selectedNumber) return '';
      return buildWhatsAppUrl(selectedNumber.number, message);
    },
    [selectedNumber]
  );

  const trackClick = useCallback(
    async (event?: React.MouseEvent<HTMLAnchorElement>) => {
      event?.preventDefault();

      const customMessage = getMessageFromHref(event?.currentTarget?.href);

      const pool = numbersRef.current;
      if (pool.length === 0) {
        if (principalFallback) {
          window.open(
            buildWhatsAppUrl(principalFallback, customMessage),
            '_blank',
            'noopener,noreferrer',
          );
        }
        return;
      }

      try {
        const { data, error } = await (supabase as any).rpc('register_weighted_whatsapp_click', {
          p_visitor_id: visitorId,
          p_page_url: window.location.href,
        });

        if (error) throw error;

        const selected = (Array.isArray(data) ? data[0] : data) as WeightedClickResult | null;
        if (!selected?.number_id || !selected?.number_value) return;

        localStorage.setItem(ASSIGNED_NUMBER_ID_KEY, selected.number_id);
        setAssignedNumberId(selected.number_id);

        setNumbers((prev) =>
          prev.map((item) =>
            item.id === selected.number_id ? { ...item, click_count: item.click_count + 1 } : item
          )
        );

        window.open(buildWhatsAppUrl(selected.number_value, customMessage), '_blank', 'noopener,noreferrer');
        void refetchPeek();
      } catch (err) {
        console.error('Click tracking error:', err);

        const fallbackPool = numbersRef.current;
        if (fallbackPool.length === 0) return;

        const fallbackSelected = assignedNumberId
          ? fallbackPool.find((number) => number.id === assignedNumberId) || selectByWeight(fallbackPool)
          : selectByWeight(fallbackPool);

        if (!fallbackSelected) return;

        localStorage.setItem(ASSIGNED_NUMBER_ID_KEY, fallbackSelected.id);
        setAssignedNumberId(fallbackSelected.id);

        window.open(buildWhatsAppUrl(fallbackSelected.number, customMessage), '_blank', 'noopener,noreferrer');

        try {
          await supabase.rpc('register_whatsapp_click', {
            p_number_id: fallbackSelected.id,
            p_visitor_id: visitorId,
            p_page_url: window.location.href,
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
    [assignedNumberId, visitorId, principalFallback, refetchPeek]
  );

  return (
    <WhatsAppContext.Provider
      value={{
        assignedNumber,
        assignedNumberId: selectedNumber?.id || '',
        visitorId,
        getWhatsAppUrl,
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
