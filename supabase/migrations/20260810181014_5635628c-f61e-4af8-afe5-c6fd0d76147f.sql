CREATE INDEX IF NOT EXISTS idx_reh_ano_cargo_turno
  ON public.resultados_eleicoes_historicos (ano_eleicao, cd_cargo, num_turno);

CREATE OR REPLACE FUNCTION public.hist_combos()
RETURNS TABLE(ano integer, turno integer, cargo integer, label text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin_master'::app_role)
          OR public.has_role(auth.uid(), 'coordenador_estadual'::app_role)) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  SELECT DISTINCT r.ano_eleicao, r.num_turno, r.cd_cargo, r.ds_cargo
  FROM public.resultados_eleicoes_historicos r
  ORDER BY 1, 3, 2;
END;
$$;

REVOKE ALL ON FUNCTION public.hist_combos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hist_combos() TO authenticated;