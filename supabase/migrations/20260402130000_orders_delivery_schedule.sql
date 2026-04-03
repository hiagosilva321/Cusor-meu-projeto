-- ============================================================================
-- MIGRATION: Agendamento de entrega no pedido
-- Data: 2026-04-02
-- Objetivo: Adicionar data e horario de entrega desejados pelo cliente
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS data_entrega DATE NULL,
  ADD COLUMN IF NOT EXISTS horario_entrega TEXT NULL;

-- CHECK: horario deve ser um dos slots validos
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_horario_entrega;
ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_horario_entrega
  CHECK (horario_entrega IS NULL OR horario_entrega IN (
    'manha',
    'tarde',
    'dia_todo'
  ));

COMMENT ON COLUMN public.orders.data_entrega IS 'Data desejada para entrega da cacamba (escolhida pelo cliente no checkout)';
COMMENT ON COLUMN public.orders.horario_entrega IS 'Periodo desejado: manha | tarde | dia_todo';
