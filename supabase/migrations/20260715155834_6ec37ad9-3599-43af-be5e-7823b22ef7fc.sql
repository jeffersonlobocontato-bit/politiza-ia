REVOKE ALL ON FUNCTION public.get_productivity_ranking(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_productivity_ranking(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_productivity_ranking(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_productivity_ranking(uuid, integer) TO service_role;