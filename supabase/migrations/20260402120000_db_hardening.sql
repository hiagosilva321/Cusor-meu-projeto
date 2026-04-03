-- ============================================================================
-- MIGRATION: Blindagem do banco (Doc Ouro)
-- Data: 2026-04-02
-- Objetivo: Indexes de performance, CHECK constraints, updated_at em regions,
--           constraint naming e integridade de dados
-- ============================================================================

-- ─── 1. INDEXES DE PERFORMANCE ──────────────────────────────────────────────
-- Campos usados em WHERE/JOIN por Edge Functions, admin e frontend

-- orders: webhook busca por transaction_id, frontend busca por token
CREATE INDEX IF NOT EXISTS idx_orders_fastsoft_transaction_id
  ON public.orders (fastsoft_transaction_id)
  WHERE fastsoft_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_public_access_token
  ON public.orders (public_access_token);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders (payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);

-- leads: admin filtra por status e data
CREATE INDEX IF NOT EXISTS idx_leads_status
  ON public.leads (status);

CREATE INDEX IF NOT EXISTS idx_leads_created_at
  ON public.leads (created_at DESC);

-- whatsapp_clicks: RPC busca por visitor_id, stats por number_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_visitor_id
  ON public.whatsapp_clicks (visitor_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_number_id
  ON public.whatsapp_clicks (number_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_clicks_created_at
  ON public.whatsapp_clicks (created_at DESC);

-- whatsapp_numbers: frontend filtra por active
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_active
  ON public.whatsapp_numbers (active)
  WHERE active = true;

-- dumpster_sizes: frontend filtra por active
CREATE INDEX IF NOT EXISTS idx_dumpster_sizes_active
  ON public.dumpster_sizes (active)
  WHERE active = true;

-- site_offers: frontend filtra por active
CREATE INDEX IF NOT EXISTS idx_site_offers_active
  ON public.site_offers (active)
  WHERE active = true;

-- ─── 2. CHECK CONSTRAINTS (validacao no banco) ─────────────────────────────
-- Garante que status so aceita valores validos — evita dados sujos

-- orders.payment_status: apenas valores conhecidos
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_payment_status;
ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_payment_status
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'refunded'));

-- orders.status: apenas valores conhecidos
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_status;
ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_status
  CHECK (status IN ('pendente', 'aguardando_pagamento', 'pago', 'cancelado', 'entregue'));

-- orders.forma_pagamento
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_forma_pagamento;
ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_forma_pagamento
  CHECK (forma_pagamento IN ('pix'));

-- orders.quantidade: entre 1 e 99
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_quantidade;
ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_quantidade
  CHECK (quantidade >= 1 AND quantidade <= 99);

-- orders.valor_unitario: positivo e razoavel
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_valor_unitario;
ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_valor_unitario
  CHECK (valor_unitario > 0 AND valor_unitario <= 100000);

-- orders.valor_total: positivo
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_valor_total;
ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_valor_total
  CHECK (valor_total > 0);

-- leads.quantidade: entre 1 e 99
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS chk_leads_quantidade;
ALTER TABLE public.leads
  ADD CONSTRAINT chk_leads_quantidade
  CHECK (quantidade >= 1 AND quantidade <= 99);

-- dumpster_sizes.price: positivo
ALTER TABLE public.dumpster_sizes
  DROP CONSTRAINT IF EXISTS chk_dumpster_sizes_price;
ALTER TABLE public.dumpster_sizes
  ADD CONSTRAINT chk_dumpster_sizes_price
  CHECK (price >= 0);

-- site_offers.price_current: positivo
ALTER TABLE public.site_offers
  DROP CONSTRAINT IF EXISTS chk_site_offers_price_current;
ALTER TABLE public.site_offers
  ADD CONSTRAINT chk_site_offers_price_current
  CHECK (price_current >= 0);

-- whatsapp_numbers.peso_distribuicao: minimo 1
ALTER TABLE public.whatsapp_numbers
  DROP CONSTRAINT IF EXISTS chk_whatsapp_numbers_peso;
ALTER TABLE public.whatsapp_numbers
  ADD CONSTRAINT chk_whatsapp_numbers_peso
  CHECK (peso_distribuicao >= 1);

-- ─── 3. CAMPO FALTANTE: regions.updated_at ──────────────────────────────────

ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Trigger de updated_at para regions
DROP TRIGGER IF EXISTS update_regions_updated_at ON public.regions;
CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 4. UNIQUE CONSTRAINTS ─────────────────────────────────────────────────
-- Previne duplicidade de dados criticos

-- whatsapp_numbers.number deve ser unico
ALTER TABLE public.whatsapp_numbers
  DROP CONSTRAINT IF EXISTS uq_whatsapp_numbers_number;
ALTER TABLE public.whatsapp_numbers
  ADD CONSTRAINT uq_whatsapp_numbers_number UNIQUE (number);

-- dumpster_sizes.size deve ser unico (codigo do tamanho)
ALTER TABLE public.dumpster_sizes
  DROP CONSTRAINT IF EXISTS uq_dumpster_sizes_size;
ALTER TABLE public.dumpster_sizes
  ADD CONSTRAINT uq_dumpster_sizes_size UNIQUE (size);

-- regions.name deve ser unico
ALTER TABLE public.regions
  DROP CONSTRAINT IF EXISTS uq_regions_name;
ALTER TABLE public.regions
  ADD CONSTRAINT uq_regions_name UNIQUE (name);

-- ─── 5. NOT NULL onde fazia sentido mas estava nullable ─────────────────────

-- whatsapp_clicks: visitor_id e number_id nao devem ser null em inserts reais
-- (mantemos nullable por compatibilidade com dados existentes)
-- Apenas index parcial ja cobre

-- ─── 6. COMENTARIOS NAS TABELAS (documentacao viva no banco) ───────────────

COMMENT ON TABLE public.orders IS 'Pedidos de cacamba com dados de pagamento PIX via FastSoft';
COMMENT ON TABLE public.leads IS 'Leads capturados pelo formulario de contato da landing';
COMMENT ON TABLE public.dumpster_sizes IS 'Catalogo de tamanhos de cacamba com precos';
COMMENT ON TABLE public.site_offers IS 'Ofertas promocionais exibidas na landing';
COMMENT ON TABLE public.regions IS 'Regioes de atendimento exibidas na landing';
COMMENT ON TABLE public.site_counters IS 'Contadores sociais exibidos na landing (pedidos, clientes, etc)';
COMMENT ON TABLE public.site_settings IS 'Configuracoes globais do site (nome, contato, logo)';
COMMENT ON TABLE public.whatsapp_numbers IS 'Numeros de WhatsApp com peso de distribuicao para balanceamento';
COMMENT ON TABLE public.whatsapp_clicks IS 'Registro de cliques em numeros de WhatsApp por visitante';

COMMENT ON COLUMN public.orders.payment_status IS 'pending | paid | failed | expired | refunded';
COMMENT ON COLUMN public.orders.status IS 'pendente | aguardando_pagamento | pago | cancelado | entregue';
COMMENT ON COLUMN public.orders.public_access_token IS 'Token UUID para consulta publica do pedido via get-order-status';
COMMENT ON COLUMN public.orders.fastsoft_transaction_id IS 'ID da transacao na FastSoft — usado pelo webhook para match';
COMMENT ON COLUMN public.orders.pix_qr_code IS 'QR Code PIX como base64 PNG da FastSoft';
COMMENT ON COLUMN public.orders.pix_copy_paste IS 'Codigo EMV copia-e-cola do PIX';
COMMENT ON COLUMN public.whatsapp_numbers.peso_distribuicao IS 'Peso relativo para distribuicao ponderada de cliques (minimo 1)';
COMMENT ON COLUMN public.whatsapp_numbers.click_count IS 'Contador atomico de cliques — incrementado por RPC';
