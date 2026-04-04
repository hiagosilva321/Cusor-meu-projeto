-- ============================================================
-- MIGRATION: Landing page content editable via admin
-- Adds all hardcoded LP text to site_settings so the admin
-- can edit every section without touching code.
-- ============================================================

-- ── Hero Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_badge TEXT NOT NULL DEFAULT '⚡ Entrega no mesmo dia em SP e Região';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_title TEXT NOT NULL DEFAULT 'Aluguel de Caçambas com Entrega Rápida e Segura';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_subtitle TEXT NOT NULL DEFAULT 'Preço fechado com entrega, permanência e retirada. Sem surpresas. Solicite agora e receba sua caçamba hoje.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_cta_primary TEXT NOT NULL DEFAULT 'Pedir pelo WhatsApp';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_cta_secondary TEXT NOT NULL DEFAULT 'Ver Tamanhos e Preços';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS hero_trust_marks JSONB NOT NULL DEFAULT '[{"label":"Entrega hoje","highlight":false},{"label":"Licença CETESB","highlight":true},{"label":"15+ caminhões","highlight":false}]'::jsonb;

-- ── Benefits Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS benefits_title TEXT NOT NULL DEFAULT 'Por que a gente?';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS benefits_items JSONB NOT NULL DEFAULT '[{"title":"Mesmo dia","description":"Sua obra não para."},{"title":"Preço fechado","description":"Zero taxa extra."},{"title":"WhatsApp direto","description":"Sem burocracia."},{"title":"Descarte legal","description":"Normas ambientais."},{"title":"Frota própria","description":"Equipe treinada."},{"title":"Licenciada","description":"Tudo em dia."}]'::jsonb;

-- ── How It Works Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS howit_title TEXT NOT NULL DEFAULT '4 passos. Sua caçamba no local.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS howit_steps JSONB NOT NULL DEFAULT '[{"number":"01","title":"Fale conosco","description":"Diga o tamanho e endereço pelo WhatsApp."},{"number":"02","title":"Receba no local","description":"Entregamos no mesmo dia ou na data combinada."},{"number":"03","title":"Use sem pressa","description":"Preencha a caçamba no seu ritmo de obra."},{"number":"04","title":"A gente retira","description":"Buscamos e destinamos tudo corretamente."}]'::jsonb;

-- ── What To Discard Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS discard_title TEXT NOT NULL DEFAULT 'O que pode jogar?';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS discard_subtitle TEXT NOT NULL DEFAULT 'A gente cuida de tudo.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS discard_items JSONB NOT NULL DEFAULT '["Entulho, madeira, ferro, gesso e mais","Retirada rápida no seu endereço","Destinação ecológica responsável"]'::jsonb;

-- ── CTA Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cta_title TEXT NOT NULL DEFAULT 'Sua caçamba em até 24h.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS cta_subtitle TEXT NOT NULL DEFAULT 'Resposta em menos de 5 minutos pelo WhatsApp.';

-- ── Contact Form Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_badge TEXT NOT NULL DEFAULT 'Solicite agora';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_title TEXT NOT NULL DEFAULT 'Faça Seu Pedido';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_subtitle TEXT NOT NULL DEFAULT 'Preencha o formulário e pague com PIX.';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS business_hours_weekday TEXT NOT NULL DEFAULT 'Seg a Sex: 7h às 20h';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS business_hours_saturday TEXT NOT NULL DEFAULT 'Sábado: 7h às 20h';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS business_hours_emergency TEXT NOT NULL DEFAULT 'Emergência: 24 horas';

-- ── Sizes Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sizes_title TEXT NOT NULL DEFAULT 'Quanto custa?';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sizes_subtitle TEXT NOT NULL DEFAULT 'Preço fechado — entrega, permanência e retirada inclusos.';

-- ── Regions Section ──
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS regions_title TEXT NOT NULL DEFAULT 'Onde atendemos';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS regions_subtitle TEXT NOT NULL DEFAULT 'SP capital e região metropolitana.';
