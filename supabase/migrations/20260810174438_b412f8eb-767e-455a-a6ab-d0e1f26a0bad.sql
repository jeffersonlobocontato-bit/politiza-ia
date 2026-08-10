create or replace view public.vw_resultados_combos
with (security_invoker = true) as
select distinct ano_eleicao, num_turno, cd_cargo, ds_cargo
from public.resultados_eleicoes_historicos;

grant select on public.vw_resultados_combos to authenticated;