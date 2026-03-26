import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_SITE_LABEL = 'CaçambaJá';

type SiteSettingsContextValue = {
  /** Nome vindo da BD (pode estar vazio antes do primeiro load). */
  siteName: string;
  /** Nome para mostrar no site; fallback só se não existir linha em `site_settings`. */
  displayName: string;
  loading: boolean;
  refetch: () => Promise<void>;
};

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

const BC_NAME = 'cacamba-site-settings';

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [siteName, setSiteName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('site_name')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[SiteSettings]', error.message);
        return;
      }
      const raw = data?.site_name != null ? String(data.site_name).trim() : '';
      setSiteName(raw);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel('site-settings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          void load();
        },
      )
      .subscribe();

    const poll = window.setInterval(() => void load(), 45_000);

    /** Mesmo separador / outro separador: admin guardou → aviso instantâneo (Realtime anónimo falha por vezes). */
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = () => void load();
    } catch {
      /* Safari antigo */
    }

    const onFocus = () => void load();
    const onVis = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    /** Outros separadores gravam rev na localStorage */
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cacamba_site_settings_rev') void load();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
      bc?.close();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('storage', onStorage);
    };
  }, [load]);

  const value = useMemo((): SiteSettingsContextValue => {
    const displayName = siteName.trim() || DEFAULT_SITE_LABEL;
    return {
      siteName,
      displayName,
      loading,
      refetch: load,
    };
  }, [siteName, loading, load]);

  return (
    <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettingsContextValue {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) {
    throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  }
  return ctx;
}

/** Para componentes que podem estar fora do provider (ex.: testes). */
export function useSiteSettingsOptional(): SiteSettingsContextValue | null {
  return useContext(SiteSettingsContext);
}
