import { useContext } from 'react';
import { SiteSettingsContext } from '@/contexts/site-settings-def';

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
