-- Rotação de WhatsApp: a cada X cliques (site-wide), o próximo número ativo é usado (por order_index).
alter table public.site_settings
  add column if not exists whatsapp_rotacao_ativa boolean not null default true,
  add column if not exists whatsapp_rotacao_a_cada integer not null default 10;

alter table public.site_settings
  add constraint site_settings_whatsapp_rotacao_a_cada_check
  check (whatsapp_rotacao_a_cada >= 1 and whatsapp_rotacao_a_cada <= 10000);

comment on column public.site_settings.whatsapp_rotacao_ativa is 'Se true, distribui por rodízio global; se false, usa peso + mesmo visitante.';
comment on column public.site_settings.whatsapp_rotacao_a_cada is 'Quantos cliques no WhatsApp até passar ao próximo número (ordem order_index).';

create or replace function public.register_weighted_whatsapp_click(
  p_visitor_id text,
  p_page_url text
)
returns table(number_id uuid, number_value text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rot_ativa boolean;
  v_rot_cada integer;
  v_number_id uuid;
  v_number_value text;
  v_total bigint;
  v_n integer;
  v_idx integer;
begin
  select s.whatsapp_rotacao_ativa,
         s.whatsapp_rotacao_a_cada
  into v_rot_ativa, v_rot_cada
  from public.site_settings s
  limit 1;

  v_rot_ativa := coalesce(v_rot_ativa, true);
  v_rot_cada := greatest(coalesce(v_rot_cada, 10), 1);

  if not v_rot_ativa then
    -- Modo legado: mesmo visitante mantém o último número; novos usam peso/click_count.
    select wn.id, wn.number
      into v_number_id, v_number_value
    from public.whatsapp_clicks wc
    join public.whatsapp_numbers wn on wn.id = wc.number_id
    where wc.visitor_id = p_visitor_id
      and wn.active = true
    order by wc.created_at desc
    limit 1;

    if v_number_id is null then
      select wn.id, wn.number
        into v_number_id, v_number_value
      from public.whatsapp_numbers wn
      where wn.active = true
      order by
        (wn.click_count::numeric / greatest(wn.peso_distribuicao, 1)::numeric) asc,
        wn.click_count asc,
        wn.order_index asc
      limit 1;
    end if;
  else
    -- Rodízio global: total de cliques já registados define o índice na fila (order_index).
    select count(*) into v_total from public.whatsapp_clicks;

    select count(*)::integer into v_n
    from public.whatsapp_numbers wn
    where wn.active = true;

    if v_n < 1 then
      return;
    end if;

    v_idx := (v_total / v_rot_cada) % v_n;

    select wn.id, wn.number
      into v_number_id, v_number_value
    from public.whatsapp_numbers wn
    where wn.active = true
    order by wn.order_index asc, wn.created_at asc
    offset v_idx
    limit 1;
  end if;

  if v_number_id is null then
    return;
  end if;

  insert into public.whatsapp_clicks (number_id, visitor_id, page_url)
  values (v_number_id, p_visitor_id, p_page_url);

  update public.whatsapp_numbers
  set click_count = click_count + 1
  where id = v_number_id;

  return query
  select v_number_id, v_number_value;
end;
$$;

-- Pré-visualização do próximo número (sem gravar clique) — alinha href da página com a lógica do servidor.
create or replace function public.peek_next_whatsapp_number(p_visitor_id text)
returns table(number_id uuid, number_value text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rot_ativa boolean;
  v_rot_cada integer;
  v_number_id uuid;
  v_number_value text;
  v_total bigint;
  v_n integer;
  v_idx integer;
begin
  select s.whatsapp_rotacao_ativa,
         s.whatsapp_rotacao_a_cada
  into v_rot_ativa, v_rot_cada
  from public.site_settings s
  limit 1;

  v_rot_ativa := coalesce(v_rot_ativa, true);
  v_rot_cada := greatest(coalesce(v_rot_cada, 10), 1);

  if not v_rot_ativa then
    select wn.id, wn.number
      into v_number_id, v_number_value
    from public.whatsapp_clicks wc
    join public.whatsapp_numbers wn on wn.id = wc.number_id
    where wc.visitor_id = p_visitor_id
      and wn.active = true
    order by wc.created_at desc
    limit 1;

    if v_number_id is null then
      select wn.id, wn.number
        into v_number_id, v_number_value
      from public.whatsapp_numbers wn
      where wn.active = true
      order by
        (wn.click_count::numeric / greatest(wn.peso_distribuicao, 1)::numeric) asc,
        wn.click_count asc,
        wn.order_index asc
      limit 1;
    end if;
  else
    select count(*) into v_total from public.whatsapp_clicks;

    select count(*)::integer into v_n
    from public.whatsapp_numbers wn
    where wn.active = true;

    if v_n < 1 then
      return;
    end if;

    v_idx := (v_total / v_rot_cada) % v_n;

    select wn.id, wn.number
      into v_number_id, v_number_value
    from public.whatsapp_numbers wn
    where wn.active = true
    order by wn.order_index asc, wn.created_at asc
    offset v_idx
    limit 1;
  end if;

  if v_number_id is null then
    return;
  end if;

  return query
  select v_number_id, v_number_value;
end;
$$;

grant execute on function public.peek_next_whatsapp_number(text) to anon, authenticated;
