import { createContext } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type SiteSettings = Tables<'site_settings'>;

export interface SiteSettingsContextType {
  settings: SiteSettings | null;
  loading: boolean;
}

export const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: null,
  loading: true,
});
