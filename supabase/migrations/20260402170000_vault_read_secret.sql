-- ============================================================
-- MIGRATION: RPC para ler secrets do vault (fallback para Edge Functions)
-- ============================================================

CREATE OR REPLACE FUNCTION public.vault_read_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  RETURN secret_value;
END;
$$;

COMMENT ON FUNCTION public.vault_read_secret(TEXT) IS 'Lê um secret do Supabase Vault por nome. Usado como fallback pelas Edge Functions.';
