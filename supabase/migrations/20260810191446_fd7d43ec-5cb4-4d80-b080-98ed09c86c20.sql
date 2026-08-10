create or replace function public.normalizar_texto(txt text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select upper(translate(txt,
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
  ))
$$;

create or replace view public.vw_chapa_reeleicao
with (security_invoker = true) as
select
  s.id as slate_id,
  s.name,
  s.party,
  s.cargo,
  r.ano_eleicao,
  r.nm_municipio,
  r.nm_municipio_normalizado,
  r.qt_votos as votos_historicos,
  r.nm_candidato as nome_no_historico
from public.party_slate_candidates s
join public.resultados_eleicoes_historicos r
  on r.ds_cargo = s.cargo
 and public.normalizar_texto(r.nm_candidato) = public.normalizar_texto(s.name)
where s.deleted_at is null
  and s.is_active = true;

create or replace view public.vw_espaco_eleitoral_disponivel
with (security_invoker = true) as
with bolo_eleitoral as (
  select
    nm_municipio, nm_municipio_normalizado, cd_cargo, ds_cargo,
    sum(qt_votos) filter (where upper(nm_candidato) not in ('NULO','BRANCO')) as total_votos_validos
  from public.resultados_eleicoes_historicos
  where ano_eleicao = 2022 and num_turno = 1
  group by nm_municipio, nm_municipio_normalizado, cd_cargo, ds_cargo
),
voto_comprometido as (
  select
    nm_municipio_normalizado, cargo,
    sum(votos_historicos) as votos_reeleicao,
    count(distinct slate_id) as qtd_candidatos_reeleicao
  from public.vw_chapa_reeleicao
  where ano_eleicao = 2022
  group by nm_municipio_normalizado, cargo
)
select
  b.nm_municipio,
  b.nm_municipio_normalizado,
  b.cd_cargo,
  b.ds_cargo,
  b.total_votos_validos,
  coalesce(v.votos_reeleicao, 0) as votos_comprometidos_reeleicao,
  coalesce(v.qtd_candidatos_reeleicao, 0) as qtd_candidatos_reeleicao,
  greatest(b.total_votos_validos - coalesce(v.votos_reeleicao, 0), 0) as espaco_disponivel,
  round(100.0 * greatest(b.total_votos_validos - coalesce(v.votos_reeleicao, 0), 0) / nullif(b.total_votos_validos, 0), 1) as pct_espaco_disponivel
from bolo_eleitoral b
left join voto_comprometido v
  on v.nm_municipio_normalizado = b.nm_municipio_normalizado
 and v.cargo = b.ds_cargo;

create or replace function public.fn_diagnostico_chapa(
  p_slate_id uuid,
  p_cenario text default 'medio'
)
returns table (
  nm_municipio text,
  espaco_disponivel bigint,
  pct_espaco_disponivel numeric,
  candidato_ja_votou_aqui boolean,
  votos_proprios_historicos bigint,
  meta_cenario integer,
  votos_acumulados_ranking bigint,
  pct_meta_coberta numeric
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_cargo text;
  v_meta integer;
begin
  if not (public.has_role(auth.uid(), 'admin_master'::app_role)
          or public.has_role(auth.uid(), 'coordenador_estadual'::app_role)) then
    raise exception 'access denied';
  end if;

  select s.cargo,
         case p_cenario
           when 'ruim' then s.votes_ruim
           when 'bom' then s.votes_bom
           else s.votes_medio
         end
    into v_cargo, v_meta
  from public.party_slate_candidates s
  where s.id = p_slate_id;

  return query
  with own as (
    select cr.nm_municipio_normalizado as mun, sum(cr.votos_historicos)::bigint as votos
    from public.vw_chapa_reeleicao cr
    where cr.slate_id = p_slate_id and cr.ano_eleicao = 2022
    group by 1
  ),
  base as (
    select
      e.nm_municipio::text as nm_municipio,
      e.espaco_disponivel::bigint as espaco_disponivel,
      e.pct_espaco_disponivel::numeric as pct_espaco_disponivel,
      (o.votos is not null) as candidato_ja_votou_aqui,
      coalesce(o.votos, 0)::bigint as votos_proprios_historicos
    from public.vw_espaco_eleitoral_disponivel e
    left join own o on o.mun = e.nm_municipio_normalizado
    where e.ds_cargo = v_cargo
  )
  select
    b.nm_municipio,
    b.espaco_disponivel,
    b.pct_espaco_disponivel,
    b.candidato_ja_votou_aqui,
    b.votos_proprios_historicos,
    v_meta as meta_cenario,
    (sum(b.espaco_disponivel) over (order by b.espaco_disponivel desc, b.nm_municipio
                                    rows between unbounded preceding and current row))::bigint as votos_acumulados_ranking,
    round(100.0 * (sum(b.espaco_disponivel) over (order by b.espaco_disponivel desc, b.nm_municipio
                                                  rows between unbounded preceding and current row)) / nullif(v_meta, 0), 1) as pct_meta_coberta
  from base b
  order by b.espaco_disponivel desc, b.nm_municipio;
end;
$$;

revoke all on function public.fn_diagnostico_chapa(uuid, text) from public, anon;
grant execute on function public.fn_diagnostico_chapa(uuid, text) to authenticated;