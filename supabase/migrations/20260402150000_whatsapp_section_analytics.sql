-- ============================================================
-- MIGRATION: RPCs para analytics de WhatsApp por seção
-- ============================================================

-- Cliques agrupados por seção da landing page (extrai do page_url hash)
CREATE OR REPLACE FUNCTION public.get_clicks_by_section()
RETURNS TABLE(section TEXT, total_clicks BIGINT, unique_visitors BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN page_url LIKE '%#hero%' THEN 'Hero'
      WHEN page_url LIKE '%#tamanhos%' THEN 'Tamanhos'
      WHEN page_url LIKE '%#contato%' THEN 'Formulário'
      WHEN page_url LIKE '%#cta%' THEN 'CTA Final'
      WHEN page_url LIKE '%#header%' THEN 'Header'
      WHEN page_url LIKE '%#flutuante%' THEN 'Botão Flutuante'
      WHEN page_url LIKE '%#como-funciona%' THEN 'Como Funciona'
      WHEN page_url LIKE '%/checkout%' THEN 'Checkout'
      WHEN page_url LIKE '%/pagamento%' THEN 'Pagamento'
      WHEN page_url IS NULL OR page_url = '' THEN 'Desconhecido'
      ELSE 'Página Inicial'
    END AS section,
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT visitor_id) AS unique_visitors
  FROM public.whatsapp_clicks
  GROUP BY section
  ORDER BY total_clicks DESC;
$$;

-- Total de cliques e visitantes únicos globais
CREATE OR REPLACE FUNCTION public.get_whatsapp_unique_visitors()
RETURNS TABLE(total_clicks BIGINT, unique_visitors BIGINT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT visitor_id) AS unique_visitors
  FROM public.whatsapp_clicks;
$$;
