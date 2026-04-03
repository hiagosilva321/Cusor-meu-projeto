-- ============================================================
-- MIGRATION: Tracking de origem (chip/atendente) nos pedidos
-- ============================================================

-- Coluna para armazenar de qual chip/atendente veio o pedido
-- Valor vem do ?ref= no link do checkout (ex: ?ref=joao)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Index para queries de agrupamento por chip
CREATE INDEX IF NOT EXISTS idx_orders_referral_source
  ON public.orders (referral_source)
  WHERE referral_source IS NOT NULL;

COMMENT ON COLUMN public.orders.referral_source IS 'Slug do chip/atendente que originou o pedido via ?ref= no checkout. Ex: joao, maria.';
