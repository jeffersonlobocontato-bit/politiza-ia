DELETE FROM public.resultados_eleicoes_historicos WHERE ds_cargo = '#NULO#';
REVOKE ALL ON public.resultados_eleicoes_historicos FROM sandbox_exec;

CREATE OR REPLACE FUNCTION public.hist_candidatos(p_ano int, p_turno int, p_cargo int)
RETURNS TABLE (nm_candidato text, sg_partido text, nr_candidato text, votos bigint, pct numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT r.nm_candidato, min(r.sg_partido) AS sg_partido, min(r.nr_candidato) AS nr_candidato,
           sum(r.qt_votos)::bigint AS votos
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY r.nm_candidato
  )
  SELECT a.nm_candidato, a.sg_partido, a.nr_candidato, a.votos,
         (a.votos * 100.0 / NULLIF(sum(a.votos) OVER (), 0))::numeric AS pct
  FROM agg a
  ORDER BY a.votos DESC;
$$;

CREATE OR REPLACE FUNCTION public.hist_municipios(p_ano int, p_turno int, p_cargo int, p_candidato text)
RETURNS TABLE (cd_municipio_ibge text, nm_municipio text, votos bigint, pct numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH tot AS (
    SELECT r.nm_municipio_normalizado AS mun, sum(r.qt_votos)::bigint AS total
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY 1
  ), cand AS (
    SELECT r.nm_municipio_normalizado AS mun, sum(r.qt_votos)::bigint AS votos
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
      AND r.nm_candidato = p_candidato
    GROUP BY 1
  )
  SELECT m.codigo_ibge::text, m.nome::text, c.votos,
         (c.votos * 100.0 / NULLIF(t.total, 0))::numeric
  FROM cand c
  JOIN tot t ON t.mun = c.mun
  JOIN public.pr_municipios m
    ON upper(translate(m.nome,'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç','AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')) = c.mun;
$$;

GRANT EXECUTE ON FUNCTION public.hist_candidatos(int,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hist_municipios(int,int,int,text) TO authenticated;