-- ============================================================
-- MIGRATION: RPC para WhatsWave verificar status de pagamento
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_payment_by_phone(p_phone TEXT)
RETURNS TABLE(pedido_id TEXT, tamanho TEXT, valor_total NUMERIC, payment_status TEXT, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id::TEXT as pedido_id,
    tamanho,
    valor_total,
    payment_status,
    status,
    created_at
  FROM public.orders
  WHERE whatsapp = regexp_replace(p_phone, '[^0-9]', '', 'g')
  ORDER BY created_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.check_payment_by_phone(TEXT) IS 'Consulta o último pedido por telefone. Usado pelo WhatsWave para verificar se pagamento foi confirmado.';
