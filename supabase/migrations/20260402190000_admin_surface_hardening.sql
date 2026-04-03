-- ============================================================
-- MIGRATION: Hardening de autorização do admin e RPCs sensíveis
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  auth_user_id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_users IS 'Allowlist explícita de usuários com acesso ao painel admin.';
COMMENT ON COLUMN public.admin_users.auth_user_id IS 'UUID do auth.users com permissão administrativa.';

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can read own admin mapping"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE auth_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_admin_user() IS 'Retorna true somente quando o auth.uid() atual está na allowlist do admin.';

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO service_role;

-- Bootstrap obrigatório:
-- o acesso ao admin só existe para usuários inseridos explicitamente
-- em public.admin_users por operação autenticada como service_role.

DROP POLICY IF EXISTS "Authenticated users can manage whatsapp numbers" ON public.whatsapp_numbers;
CREATE POLICY "Admin users can manage whatsapp numbers"
  ON public.whatsapp_numbers
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can read whatsapp clicks" ON public.whatsapp_clicks;
CREATE POLICY "Admin users can read whatsapp clicks"
  ON public.whatsapp_clicks
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can manage dumpster sizes" ON public.dumpster_sizes;
CREATE POLICY "Admin users can manage dumpster sizes"
  ON public.dumpster_sizes
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can manage site counters" ON public.site_counters;
CREATE POLICY "Admin users can manage site counters"
  ON public.site_counters
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can manage regions" ON public.regions;
CREATE POLICY "Admin users can manage regions"
  ON public.regions
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
CREATE POLICY "Admin users can read leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
CREATE POLICY "Admin users can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;
CREATE POLICY "Admin users can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can update site settings" ON public.site_settings;
CREATE POLICY "Admin users can update site settings"
  ON public.site_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can manage orders" ON public.orders;
CREATE POLICY "Admin users can manage orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can manage site offers" ON public.site_offers;
CREATE POLICY "Admin users can manage site offers"
  ON public.site_offers
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE OR REPLACE FUNCTION public.get_click_stats()
RETURNS TABLE(
  number_id UUID,
  number_label TEXT,
  number_value TEXT,
  total_clicks BIGINT,
  clicks_today BIGINT,
  clicks_week BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT 
    wn.id as number_id,
    wn.label as number_label,
    wn.number as number_value,
    COUNT(wc.id) as total_clicks,
    COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE) as clicks_today,
    COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE - INTERVAL '7 days') as clicks_week
  FROM public.whatsapp_numbers wn
  LEFT JOIN public.whatsapp_clicks wc ON wc.number_id = wn.id
  WHERE wn.active = true
  GROUP BY wn.id, wn.label, wn.number
  ORDER BY total_clicks DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_clicks_by_section()
RETURNS TABLE(section TEXT, total_clicks BIGINT, unique_visitors BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN page_url LIKE '%#hero%' THEN 'Hero'
      WHEN page_url LIKE '%#tamanhos%' THEN 'Tamanhos'
      WHEN page_url LIKE '%#contato%' THEN 'Formulário'
      WHEN page_url LIKE '%#cta%' THEN 'CTA Final'
      WHEN page_url LIKE '%#header%' THEN 'Header'
      WHEN page_url LIKE '%#flutuante%' THEN 'Botão Flutuante'
      WHEN page_url LIKE '%#como-funciona%' THEN 'Como Funciona'
      WHEN page_url LIKE '%/checkout%' THEN 'Checkout'
      WHEN page_url LIKE '%/pagamento%' THEN 'Pagamento'
      WHEN page_url IS NULL OR page_url = '' THEN 'Desconhecido'
      ELSE 'Página Inicial'
    END AS section,
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT visitor_id) AS unique_visitors
  FROM public.whatsapp_clicks
  GROUP BY section
  ORDER BY total_clicks DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_whatsapp_unique_visitors()
RETURNS TABLE(total_clicks BIGINT, unique_visitors BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT visitor_id) AS unique_visitors
  FROM public.whatsapp_clicks;
END;
$$;

REVOKE ALL ON FUNCTION public.get_click_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_click_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_click_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_click_stats() TO service_role;

REVOKE ALL ON FUNCTION public.get_clicks_by_section() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_clicks_by_section() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_clicks_by_section() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clicks_by_section() TO service_role;

REVOKE ALL ON FUNCTION public.get_whatsapp_unique_visitors() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_whatsapp_unique_visitors() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_unique_visitors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_unique_visitors() TO service_role;

CREATE OR REPLACE FUNCTION public.vault_read_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  RETURN secret_value;
END;
$$;

REVOKE ALL ON FUNCTION public.vault_read_secret(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vault_read_secret(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.vault_read_secret(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.vault_read_secret(TEXT) TO service_role;
