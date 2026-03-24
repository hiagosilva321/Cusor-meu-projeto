-- Correr no Supabase → SQL Editor (ajuste se já zerou pelo script JS).
-- 1) Apaga histórico de cliques e contadores
delete from public.whatsapp_clicks;
update public.whatsapp_numbers set click_count = 0;
update public.leads set numero_atribuido = '';

-- 2) Modo “normal”: sem rodízio global (peso + mesmo visitante no último clique)
--    Só funciona depois de existirem as colunas (migração 20260324180000_whatsapp_rotacao.sql).
update public.site_settings
set whatsapp_rotacao_ativa = false,
    whatsapp_rotacao_a_cada = 10
where true;
