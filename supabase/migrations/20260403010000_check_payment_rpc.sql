-- ============================================================
-- MIGRATION: RPC para WhatsWave verificar status de pagamento
-- Normaliza telefone: remove +, 55, espaços, pontuação
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_payment_by_phone(p_phone TEXT)
RETURNS TABLE(pedido_id TEXT, tamanho TEXT, valor_total NUMERIC, payment_status TEXT, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(clean_phone) >= 12 AND clean_phone LIKE '55%' THEN
    clean_phone := substring(clean_phone from 3);
  END IF;
  
  RETURN QUERY
    SELECT 
      o.id::TEXT as pedido_id,
      o.tamanho,
      o.valor_total,
      o.payment_status,
      o.status,
      o.created_at
    FROM public.orders o
    WHERE o.whatsapp = clean_phone
       OR o.whatsapp = ('55' || clean_phone)
       OR ('55' || o.whatsapp) = clean_phone
    ORDER BY o.created_at DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.check_payment_by_phone(TEXT) IS 'Consulta último pedido por telefone. Normaliza formato (55, +, etc). Usado pelo WhatsWave.';
