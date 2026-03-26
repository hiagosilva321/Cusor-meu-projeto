import { useEffect } from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

/**
 * Sincroniza <title> e meta tags básicas com o nome do site em Configurações (Supabase).
 */
export function SitePageTitle() {
  const { displayName } = useSiteSettings();

  useEffect(() => {
    const title = `${displayName} — Resolva em 2 min no WhatsApp`;
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
  }, [displayName]);

  return null;
}
