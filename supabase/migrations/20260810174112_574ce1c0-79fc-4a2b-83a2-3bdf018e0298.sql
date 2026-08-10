create table if not exists public.resultados_eleicoes_historicos (
  id uuid primary key default gen_random_uuid(),
  ano_eleicao int not null,
  num_turno int not null,
  nm_municipio_tse text not null,
  nm_municipio text not null,
  cd_cargo int not null,
  ds_cargo text not null,
  nr_candidato text not null,
  nm_candidato text not null,
  sg_partido text not null,
  qt_votos int not null,
  created_at timestamptz not null default now(),
  nm_municipio_normalizado text generated always as (
    upper(translate(nm_municipio,
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
      'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
    ))
  ) stored
);

grant select on public.resultados_eleicoes_historicos to authenticated;
grant all on public.resultados_eleicoes_historicos to service_role;

alter table public.resultados_eleicoes_historicos enable row level security;

create index if not exists idx_resultados_ano_cargo on public.resultados_eleicoes_historicos(ano_eleicao, cd_cargo);
create index if not exists idx_resultados_municipio_norm on public.resultados_eleicoes_historicos(nm_municipio_normalizado);
create index if not exists idx_resultados_candidato on public.resultados_eleicoes_historicos(nm_candidato);

create policy "leitura restrita resultados historicos"
  on public.resultados_eleicoes_historicos for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin_master')
    or public.has_role(auth.uid(), 'coordenador_estadual')
  );

create policy "admin_master gerencia resultados historicos"
  on public.resultados_eleicoes_historicos for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin_master'))
  with check (public.has_role(auth.uid(), 'admin_master'));

create or replace view public.vw_resultados_por_municipio_ibge
with (security_invoker = true) as
select
  r.ano_eleicao, r.num_turno, r.cd_cargo, r.ds_cargo,
  r.nm_candidato, r.nr_candidato, r.sg_partido, r.qt_votos,
  m.codigo_ibge as cd_municipio_ibge,
  m.nome as nm_municipio_ibge,
  r.qt_votos * 100.0 / nullif(sum(r.qt_votos) over (
    partition by r.ano_eleicao, r.num_turno, r.cd_cargo, m.codigo_ibge
  ), 0) as pct_municipio
from public.resultados_eleicoes_historicos r
join public.pr_municipios m
  on upper(translate(m.nome,
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
      'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
    )) = r.nm_municipio_normalizado;

grant select on public.vw_resultados_por_municipio_ibge to authenticated;