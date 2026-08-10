CREATE OR REPLACE FUNCTION public.hist_municipios(
  p_ano integer,
  p_turno integer,
  p_cargo integer,
  p_candidato text
)
RETURNS TABLE(cd_municipio_ibge text, nm_municipio text, votos bigint, pct numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH tot AS (
    SELECT r.nm_municipio_normalizado AS mun, sum(r.qt_votos)::bigint AS total
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY 1
  ),
  cand AS (
    SELECT r.nm_municipio_normalizado AS mun,
           sum(
             CASE
               WHEN p_candidato = 'TODOS' OR r.nm_candidato = p_candidato THEN r.qt_votos
               ELSE 0
             END
           )::bigint AS votos
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY 1
  )
  SELECT m.codigo_ibge::text, m.nome::text, c.votos,
         (c.votos * 100.0 / NULLIF(t.total, 0))::numeric
  FROM cand c
  JOIN tot t ON t.mun = c.mun
  JOIN public.pr_municipios m
    ON upper(translate(m.nome,'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç','AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')) = c.mun
  WHERE c.votos > 0;
$$;