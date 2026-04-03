import { supabase } from '@/integrations/supabase/client';

export async function isCurrentUserAdmin() {
  const { data, error } = await supabase.rpc('is_admin_user');

  if (error) {
    console.error('[ADMIN-AUTH] RPC is_admin_user falhou:', error);
    return false;
  }

  return Boolean(data);
}

