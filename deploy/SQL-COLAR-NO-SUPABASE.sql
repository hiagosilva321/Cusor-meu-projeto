-- =============================================================================
-- CaçambaJá — cola ISTO TUDO no Supabase → SQL Editor → Run (projeto NOVO/vazio)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Função updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- -----------------------------------------------------------------------------
-- 2) Tabelas base
-- -----------------------------------------------------------------------------
CREATE TABLE public.whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  number TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  click_count INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active whatsapp numbers" ON public.whatsapp_numbers FOR SELECT USING (active = true);

CREATE TABLE public.whatsapp_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  visitor_id TEXT,
  page_url TEXT
);
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert whatsapp clicks" ON public.whatsapp_clicks FOR INSERT WITH CHECK (true);

CREATE TABLE public.dumpster_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  size TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.dumpster_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active dumpster sizes" ON public.dumpster_sizes FOR SELECT USING (active = true);

CREATE TABLE public.site_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL DEFAULT '',
  suffix TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.site_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active site counters" ON public.site_counters FOR SELECT USING (active = true);

CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active regions" ON public.regions FOR SELECT USING (active = true);

CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT DEFAULT '',
  cpf_cnpj TEXT DEFAULT '',
  cep TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  numero TEXT DEFAULT '',
  complemento TEXT DEFAULT '',
  bairro TEXT DEFAULT '',
  cidade TEXT DEFAULT '',
  estado TEXT DEFAULT '',
  tamanho TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  observacoes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Novo',
  numero_atribuido TEXT DEFAULT ''
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);

CREATE TRIGGER update_whatsapp_numbers_updated_at BEFORE UPDATE ON public.whatsapp_numbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dumpster_sizes_updated_at BEFORE UPDATE ON public.dumpster_sizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_counters_updated_at BEFORE UPDATE ON public.site_counters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3) site_settings + peso_distribuicao + políticas admin
-- -----------------------------------------------------------------------------
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'CaçambaJá',
  logo_url TEXT DEFAULT '',
  telefone_principal TEXT DEFAULT '',
  whatsapp_principal TEXT DEFAULT '',
  endereco_empresa TEXT DEFAULT '',
  email_contato TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.site_settings (site_name, telefone_principal, whatsapp_principal, email_contato)
VALUES ('CaçambaJá', '(11) 99999-9999', '5511999999999', 'contato@cacambaja.com');

ALTER TABLE public.whatsapp_numbers ADD COLUMN IF NOT EXISTS peso_distribuicao INTEGER NOT NULL DEFAULT 1;

CREATE POLICY "Authenticated users can manage whatsapp numbers" ON public.whatsapp_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read whatsapp clicks" ON public.whatsapp_clicks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage dumpster sizes" ON public.dumpster_sizes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage site counters" ON public.site_counters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage regions" ON public.regions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can update site settings" ON public.site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read active whatsapp numbers" ON public.whatsapp_numbers;
CREATE POLICY "Anyone can read active whatsapp numbers" ON public.whatsapp_numbers FOR SELECT TO anon USING (active = true);
DROP POLICY IF EXISTS "Anyone can read active dumpster sizes" ON public.dumpster_sizes;
CREATE POLICY "Anyone can read active dumpster sizes" ON public.dumpster_sizes FOR SELECT TO anon USING (active = true);
DROP POLICY IF EXISTS "Anyone can read active site counters" ON public.site_counters;
CREATE POLICY "Anyone can read active site counters" ON public.site_counters FOR SELECT TO anon USING (active = true);
DROP POLICY IF EXISTS "Anyone can read active regions" ON public.regions;
CREATE POLICY "Anyone can read active regions" ON public.regions FOR SELECT TO anon USING (active = true);

-- -----------------------------------------------------------------------------
-- 4) Funções WhatsApp / dashboard
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_whatsapp_click(p_number_id UUID, p_visitor_id TEXT, p_page_url TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.whatsapp_clicks (number_id, visitor_id, page_url) VALUES (p_number_id, p_visitor_id, p_page_url);
  UPDATE public.whatsapp_numbers SET click_count = click_count + 1 WHERE id = p_number_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_click_stats()
RETURNS TABLE(number_id UUID, number_label TEXT, number_value TEXT, total_clicks BIGINT, clicks_today BIGINT, clicks_week BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT wn.id, wn.label, wn.number, COUNT(wc.id), COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE),
    COUNT(wc.id) FILTER (WHERE wc.created_at >= CURRENT_DATE - INTERVAL '7 days')
  FROM public.whatsapp_numbers wn
  LEFT JOIN public.whatsapp_clicks wc ON wc.number_id = wn.id
  WHERE wn.active = true
  GROUP BY wn.id, wn.label, wn.number ORDER BY COUNT(wc.id) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.register_whatsapp_click(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_click_stats() TO authenticated;

-- -----------------------------------------------------------------------------
-- 5) Pedidos (checkout / PIX)
-- -----------------------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL, whatsapp text NOT NULL, email text NULL DEFAULT '', cpf_cnpj text NULL DEFAULT '',
  cep text NULL DEFAULT '', endereco text NULL DEFAULT '', numero text NULL DEFAULT '', complemento text NULL DEFAULT '',
  bairro text NULL DEFAULT '', cidade text NULL DEFAULT '', estado text NULL DEFAULT '',
  tamanho text NOT NULL, quantidade integer NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0, valor_total numeric NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL DEFAULT 'pix', status text NOT NULL DEFAULT 'pendente',
  payment_status text NOT NULL DEFAULT 'pending',
  pagarme_order_id text NULL, pagarme_charge_id text NULL,
  pix_qr_code text NULL, pix_qr_code_url text NULL, pix_copy_paste text NULL,
  pix_expires_at timestamp with time zone NULL, paid_at timestamp with time zone NULL,
  observacoes text NULL DEFAULT '', created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read orders" ON public.orders FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders RENAME COLUMN pagarme_order_id TO fastsoft_transaction_id;
ALTER TABLE public.orders RENAME COLUMN pagarme_charge_id TO fastsoft_external_ref;

-- -----------------------------------------------------------------------------
-- 6) Clique WhatsApp ponderado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_weighted_whatsapp_click(p_visitor_id text, p_page_url text)
RETURNS TABLE(number_id uuid, number_value text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_number_id uuid; v_number_value text;
BEGIN
  SELECT wn.id, wn.number INTO v_number_id, v_number_value
  FROM public.whatsapp_clicks wc JOIN public.whatsapp_numbers wn ON wn.id = wc.number_id
  WHERE wc.visitor_id = p_visitor_id AND wn.active = true ORDER BY wc.created_at DESC LIMIT 1;
  IF v_number_id IS NULL THEN
    SELECT wn.id, wn.number INTO v_number_id, v_number_value FROM public.whatsapp_numbers wn WHERE wn.active = true
    ORDER BY (wn.click_count::numeric / greatest(wn.peso_distribuicao, 1)::numeric) ASC, wn.click_count ASC, wn.order_index ASC LIMIT 1;
  END IF;
  IF v_number_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.whatsapp_clicks (number_id, visitor_id, page_url) VALUES (v_number_id, p_visitor_id, p_page_url);
  UPDATE public.whatsapp_numbers SET click_count = click_count + 1 WHERE id = v_number_id;
  RETURN QUERY SELECT v_number_id, v_number_value;
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_weighted_whatsapp_click(text, text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7) Ofertas
-- -----------------------------------------------------------------------------
CREATE TABLE public.site_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', badge TEXT NOT NULL DEFAULT 'Oferta',
  price_current NUMERIC(10,2) NOT NULL DEFAULT 0, price_original NUMERIC(10,2) NULL,
  active BOOLEAN NOT NULL DEFAULT true, order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.site_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active site offers" ON public.site_offers FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated users can manage site offers" ON public.site_offers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_site_offers_updated_at BEFORE UPDATE ON public.site_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.site_offers (title, description, badge, price_current, price_original, active, order_index) VALUES
('Caçamba 5m³ — promoção', 'Entrega no mesmo dia na grande SP.', 'DESTAQUE', 349.90, 399.90, true, 1),
('Caçamba 7m³ especial', 'Ideal para obras médias.', 'OFERTA', 459.90, 529.90, true, 2),
('Combo 2x 3m³', 'Duas caçambas pequenas.', 'COMBO', 580.00, 650.00, true, 3);

-- -----------------------------------------------------------------------------
-- 8) Dados de exemplo (altera o número no admin depois)
-- -----------------------------------------------------------------------------
INSERT INTO public.whatsapp_numbers (number, label, active, order_index, peso_distribuicao, click_count)
VALUES ('5511999999999', 'WhatsApp principal', true, 1, 1, 0);

INSERT INTO public.dumpster_sizes (size, title, description, price, order_index, active) VALUES
('3m³', 'Pequenas obras', 'Reformas rápidas.', 180.00, 1, true),
('4m³', 'Reformas médias', 'Banheiro, cozinha.', 260.00, 2, true),
('5m³', 'Residencial', 'Casa e apartamento.', 340.00, 3, true),
('7m³', 'Obras grandes', 'Construção.', 460.00, 4, true),
('15m³', 'Grandes projetos', 'Grande porte.', 720.00, 5, true);

-- =============================================================================
-- Fim. Cria utilizador admin em Authentication → Users no painel Supabase.
-- =============================================================================
