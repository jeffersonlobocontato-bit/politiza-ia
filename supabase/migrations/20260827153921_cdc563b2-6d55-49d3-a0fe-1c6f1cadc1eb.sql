CREATE OR REPLACE FUNCTION public.tmp_install_logistica(_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE _sql;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tmp_install_logistica(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tmp_install_logistica(text) TO service_role;