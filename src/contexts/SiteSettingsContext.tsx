import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { SiteSettingsContext } from './site-settings-def';

type SiteSettings = Tables<'site_settings'>;

function applyTitle(name?: string | null) {
  if (name) document.title = `${name} - Aluguel de Caçambas | Entrega Rápida SP`;
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();
    if (data) {
      setSettings(data);
      applyTitle(data.site_name);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();

    // Realtime: atualiza quando site_settings muda no banco
    const channel = supabase
      .channel('site-settings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSettings]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}
