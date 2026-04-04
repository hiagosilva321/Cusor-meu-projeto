-- ============================================================
-- MIGRATION: Hardening RLS — fechar insert publico
-- Data: 2026-04-03
-- ============================================================

-- REMOVER insert publico em orders (so Edge Function com service_role insere)
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;

-- REMOVER insert publico em leads (so Edge Function insere via service_role)
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

-- REMOVER select publico em orders (ja tokenizado via get-order-status)
DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;

-- Garantir que anon nao consegue escrever em tabelas de catalogo
-- (as policies ALL sao para authenticated+is_admin_user, anon so tem SELECT)
-- Nada a mudar — RLS ja protege. Apenas documentando.

COMMENT ON POLICY "Admin users can manage dumpster sizes" ON public.dumpster_sizes IS 'Somente admin (is_admin_user) pode write. Anon tem apenas SELECT active=true.';
COMMENT ON POLICY "Admin users can manage regions" ON public.regions IS 'Somente admin (is_admin_user) pode write. Anon tem apenas SELECT active=true.';
COMMENT ON POLICY "Admin users can manage site offers" ON public.site_offers IS 'Somente admin (is_admin_user) pode write. Anon tem apenas SELECT active=true.';
COMMENT ON POLICY "Admin users can manage site counters" ON public.site_counters IS 'Somente admin (is_admin_user) pode write. Anon tem apenas SELECT active=true.';
COMMENT ON POLICY "Admin users can manage whatsapp numbers" ON public.whatsapp_numbers IS 'Somente admin (is_admin_user) pode write. Anon tem apenas SELECT active=true.';
