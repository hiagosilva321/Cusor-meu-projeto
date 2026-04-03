-- ============================================================
-- MIGRATION: Ajudantes — preço configurável + campo nos pedidos
-- ============================================================

-- Valor do ajudante gerenciável pelo admin
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS helper_price NUMERIC NOT NULL DEFAULT 125;
COMMENT ON COLUMN public.site_settings.helper_price IS 'Valor por ajudante (R$). Configurável no admin, usado no checkout e gateway.';

-- Quantidade de ajudantes no pedido + valor calculado
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ajudantes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS valor_ajudantes NUMERIC NOT NULL DEFAULT 0;

-- Ajudantes no lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ajudantes INTEGER NOT NULL DEFAULT 0;
