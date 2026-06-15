CREATE OR REPLACE FUNCTION public.get_delegable_members(_user_id uuid, _candidate_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  role text,
  hierarchy_level integer,
  supervisor_id uuid,
  municipality text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(_user_id) THEN
    RETURN QUERY
      SELECT cm.id, cm.user_id, cm.name, cm.role, cm.hierarchy_level, cm.supervisor_id, cm.municipality
      FROM public.campaign_members cm
      WHERE (_candidate_id IS NULL OR cm.candidate_id = _candidate_id)
        AND cm.status = 'ativo'
      ORDER BY cm.hierarchy_level, cm.name;
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE me AS (
    SELECT cm.id
    FROM public.campaign_members cm
    WHERE cm.user_id = _user_id
      AND (_candidate_id IS NULL OR cm.candidate_id = _candidate_id)
  ),
  subtree AS (
    SELECT cm.id, cm.user_id, cm.name, cm.role, cm.hierarchy_level, cm.supervisor_id, cm.municipality
    FROM public.campaign_members cm
    WHERE cm.supervisor_id IN (SELECT id FROM me)
    UNION ALL
    SELECT cm.id, cm.user_id, cm.name, cm.role, cm.hierarchy_level, cm.supervisor_id, cm.municipality
    FROM public.campaign_members cm
    JOIN subtree s ON cm.supervisor_id = s.id
  )
  SELECT s.id, s.user_id, s.name, s.role, s.hierarchy_level, s.supervisor_id, s.municipality
  FROM subtree s
  JOIN public.campaign_members cm2 ON cm2.id = s.id
  WHERE cm2.status = 'ativo'
  ORDER BY s.hierarchy_level, s.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_delegable_members(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_campaign_member(_user_id uuid, _candidate_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  hierarchy_level integer,
  candidate_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.id, cm.name, cm.role, cm.hierarchy_level, cm.candidate_id
  FROM public.campaign_members cm
  WHERE cm.user_id = _user_id
    AND (_candidate_id IS NULL OR cm.candidate_id = _candidate_id)
  ORDER BY cm.hierarchy_level
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_campaign_member(uuid, uuid) TO authenticated;