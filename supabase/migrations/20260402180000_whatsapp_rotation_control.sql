-- ============================================================
-- MIGRATION: Controle de rotação WhatsApp por contagem fixa
-- ============================================================

-- Quantidade de cliques por número antes de rotacionar para o próximo
-- Ex: rotation_size=5 → chip1 recebe 5 cliques, depois chip2 recebe 5, etc.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS whatsapp_rotation_size INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.site_settings.whatsapp_rotation_size IS 'Quantidade de cliques por número antes de rotacionar. Ex: 5 = a cada 5 cliques muda de chip.';
