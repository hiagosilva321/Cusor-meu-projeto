-- ============================================================
-- MIGRATION: Vincular leads a orders + sync automático de status
-- ============================================================

-- 1. Coluna order_id em leads (vincula lead ao pedido PIX)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_order_id
  ON public.leads (order_id)
  WHERE order_id IS NOT NULL;

COMMENT ON COLUMN public.leads.order_id IS 'FK para orders — vincula lead ao pedido PIX para sync automático de status';

-- 2. Atualizar default do status de leads
ALTER TABLE public.leads
  ALTER COLUMN status SET DEFAULT 'Não pago';

-- 3. CHECK constraint para status (aceita legado 'Novo' + novos valores)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS chk_leads_status;
ALTER TABLE public.leads
  ADD CONSTRAINT chk_leads_status
  CHECK (status IN ('Não pago', 'Pago', 'Novo'));

-- 4. Função + trigger: quando order muda para paid, lead vira "Pago"
CREATE OR REPLACE FUNCTION public.sync_lead_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    UPDATE public.leads
    SET status = 'Pago'
    WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_lead_payment_status() IS 'Auto-atualiza lead status para Pago quando pedido vinculado é pago';

DROP TRIGGER IF EXISTS trg_sync_lead_payment ON public.orders;
CREATE TRIGGER trg_sync_lead_payment
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_payment_status();

-- 5. Policy DELETE para admin poder remover leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads' AND policyname = 'Authenticated users can delete leads'
  ) THEN
    CREATE POLICY "Authenticated users can delete leads" ON public.leads
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
