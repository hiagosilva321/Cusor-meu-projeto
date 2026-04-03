-- ============================================================
-- MIGRATION: Sistema de cupons inteligentes
-- ============================================================

-- Tabela de cupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 50),
  active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can validate coupons" ON public.coupons
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Admin manages coupons" ON public.coupons
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC para validar cupom
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT)
RETURNS TABLE(coupon_id UUID, discount_percent INTEGER)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT c.id, c.discount_percent
    FROM public.coupons c
    WHERE UPPER(c.code) = UPPER(p_code)
      AND c.active = true
      AND (c.max_uses IS NULL OR c.current_uses < c.max_uses);
END;
$$;

-- Colunas de desconto nos pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS valor_desconto NUMERIC DEFAULT 0;

-- Cupons iniciais
INSERT INTO public.coupons (code, discount_percent, description) VALUES
  ('PRIMEIRA10', 10, 'Primeira locação — 10% off'),
  ('RETEC15', 15, 'Desconto intermediário — 15% off'),
  ('ESPECIAL25', 25, 'Desconto especial — 25% off'),
  ('VIP30', 30, 'Última oferta — 30% off')
ON CONFLICT (code) DO NOTHING;
