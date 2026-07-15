CREATE OR REPLACE FUNCTION public.get_productivity_ranking(p_candidate_id uuid DEFAULT NULL::uuid, p_period_days integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_cutoff timestamptz := CASE
    WHEN p_period_days IS NULL OR p_period_days <= 0 THEN '1900-01-01'::timestamptz
    ELSE now() - (p_period_days || ' days')::interval
  END;
  v_deadline date := '2026-10-04'::date;
  v_project_start date := '2026-01-01'::date;
  v_speed_window numeric := GREATEST(1, ('2026-10-04'::date - '2026-01-01'::date));
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  WITH RECURSIVE member_source AS (
    SELECT
      cm.id,
      cm.user_id,
      COALESCE(cm.user_id, p_email.id, p_name.id) AS resolved_user_id,
      cm.name,
      cm.role,
      cm.hierarchy_level,
      cm.supervisor_id,
      cm.municipality,
      cm.candidate_id
    FROM public.campaign_members cm
    LEFT JOIN public.profiles p_email
      ON cm.user_id IS NULL
      AND cm.email IS NOT NULL
      AND p_email.email IS NOT NULL
      AND lower(trim(p_email.email)) = lower(trim(cm.email))
    LEFT JOIN public.profiles p_name
      ON cm.user_id IS NULL
      AND cm.email IS NULL
      AND cm.name IS NOT NULL
      AND p_name.full_name IS NOT NULL
      AND lower(trim(p_name.full_name)) = lower(trim(cm.name))
    WHERE cm.status = 'ativo'
      AND cm.hierarchy_level BETWEEN 3 AND 6
      AND (p_candidate_id IS NULL OR cm.candidate_id IS NULL OR cm.candidate_id = p_candidate_id)
  ),
  members AS (
    SELECT DISTINCT ON (id)
      id,
      user_id,
      resolved_user_id,
      name,
      role,
      hierarchy_level,
      supervisor_id,
      municipality,
      candidate_id
    FROM member_source
    ORDER BY id
  ),
  scored_actions AS (
    SELECT
      a.id,
      a.created_by,
      a.impact_score,
      COALESCE(a.executed_people_count, 0) AS people,
      a.created_at
    FROM public.actions a
    WHERE a.deleted_at IS NULL
      AND a.status = 'realizada'
      AND a.impact_score IS NOT NULL
      AND a.created_by IS NOT NULL
      AND a.created_at >= v_cutoff
      AND (p_candidate_id IS NULL OR a.candidate_id = p_candidate_id)
  ),
  action_actor AS (
    SELECT DISTINCT ON (sa.id)
      sa.id,
      sa.created_by,
      sa.impact_score,
      sa.people,
      sa.created_at,
      m.id AS actor_member_id,
      m.hierarchy_level AS actor_level
    FROM scored_actions sa
    JOIN members m ON m.resolved_user_id = sa.created_by
    ORDER BY
      sa.id,
      CASE
        WHEN p_candidate_id IS NOT NULL AND m.candidate_id = p_candidate_id THEN 0
        WHEN m.candidate_id IS NULL THEN 1
        ELSE 2
      END,
      m.hierarchy_level DESC,
      m.name
  ),
  member_tree(root_id, member_id, path) AS (
    SELECT m.id, m.id, ARRAY[m.id]
    FROM members m
    UNION ALL
    SELECT mt.root_id, child.id, mt.path || child.id
    FROM member_tree mt
    JOIN members child ON child.supervisor_id = mt.member_id
    WHERE NOT child.id = ANY(mt.path)
  ),
  row_actions AS (
    SELECT
      mt.root_id,
      aa.id AS action_id,
      aa.impact_score,
      aa.people,
      aa.created_at
    FROM member_tree mt
    JOIN action_actor aa ON aa.actor_member_id = mt.member_id
  ),
  own_actions AS (
    SELECT
      aa.actor_member_id AS member_id,
      aa.id AS action_id,
      aa.impact_score,
      aa.people,
      aa.created_at
    FROM action_actor aa
  ),
  first_own_action AS (
    SELECT actor_member_id AS member_id, MIN(created_at)::date AS first_action_date
    FROM action_actor
    GROUP BY actor_member_id
  ),
  direct_child_stats AS (
    SELECT
      parent.id AS parent_id,
      COUNT(child.id) FILTER (WHERE foa.first_action_date IS NOT NULL)::int AS active_count,
      AVG(GREATEST(0, v_deadline - foa.first_action_date)) FILTER (WHERE foa.first_action_date IS NOT NULL) AS avg_lead_days
    FROM members parent
    LEFT JOIN members child ON child.supervisor_id = parent.id
    LEFT JOIN first_own_action foa ON foa.member_id = child.id
    GROUP BY parent.id
  ),
  descendant_counts AS (
    SELECT
      mt.root_id,
      COUNT(DISTINCT m.id) FILTER (WHERE m.hierarchy_level = 6)::int AS leader_count
    FROM member_tree mt
    JOIN members m ON m.id = mt.member_id
    WHERE mt.root_id <> mt.member_id
    GROUP BY mt.root_id
  ),
  coordinator_rollup AS (
    SELECT
      m.id::text AS id,
      m.name,
      m.hierarchy_level,
      COALESCE(SUM(ra.impact_score), 0)::int AS total_score,
      COALESCE(ROUND(AVG(ra.impact_score)), 0)::int AS avg_score,
      COUNT(ra.action_id)::int AS action_count,
      COALESCE(dc.leader_count, 0)::int AS leader_count,
      COALESCE(SUM(ra.people), 0)::int AS people_impacted,
      COALESCE(dcs.active_count, 0)::int AS active_count,
      COALESCE(ROUND(dcs.avg_lead_days)::int, 0) AS avg_lead_days
    FROM members m
    LEFT JOIN row_actions ra ON ra.root_id = m.id
    LEFT JOIN direct_child_stats dcs ON dcs.parent_id = m.id
    LEFT JOIN descendant_counts dc ON dc.root_id = m.id
    WHERE m.hierarchy_level BETWEEN 3 AND 5
    GROUP BY m.id, m.name, m.hierarchy_level, dc.leader_count, dcs.active_count, dcs.avg_lead_days
  ),
  leader_rollup AS (
    SELECT
      m.id::text AS id,
      m.name,
      m.hierarchy_level,
      COALESCE(SUM(oa.impact_score), 0)::int AS total_score,
      COALESCE(ROUND(AVG(oa.impact_score)), 0)::int AS avg_score,
      COUNT(oa.action_id)::int AS action_count,
      0::int AS leader_count,
      COALESCE(SUM(oa.people), 0)::int AS people_impacted,
      0::int AS active_count,
      0::int AS avg_lead_days
    FROM members m
    LEFT JOIN own_actions oa ON oa.member_id = m.id
    WHERE m.hierarchy_level = 6
    GROUP BY m.id, m.name, m.hierarchy_level
  ),
  member_rollup AS (
    SELECT * FROM coordinator_rollup
    UNION ALL
    SELECT * FROM leader_rollup
  ),
  level_max AS (
    SELECT
      hierarchy_level,
      NULLIF(MAX(action_count), 0)::numeric AS max_actions,
      NULLIF(MAX(active_count), 0)::numeric AS max_active
    FROM member_rollup
    GROUP BY hierarchy_level
  ),
  scored AS (
    SELECT
      mr.*,
      CASE WHEN lm.max_actions IS NULL THEN 0 ELSE ROUND(mr.action_count::numeric / lm.max_actions * 100)::int END AS actions_score,
      CASE
        WHEN mr.hierarchy_level = 6 THEN 0
        ELSE LEAST(100, ROUND(COALESCE(mr.avg_lead_days, 0)::numeric / v_speed_window * 100))::int
      END AS speed_score,
      CASE
        WHEN mr.hierarchy_level = 6 THEN 0
        WHEN lm.max_active IS NULL THEN 0
        ELSE ROUND(mr.active_count::numeric / lm.max_active * 100)::int
      END AS active_score
    FROM member_rollup mr
    JOIN level_max lm ON lm.hierarchy_level = mr.hierarchy_level
  ),
  final_rows AS (
    SELECT
      s.id,
      s.name,
      s.hierarchy_level,
      s.total_score,
      s.avg_score,
      s.action_count,
      s.leader_count,
      s.people_impacted,
      'coordenador'::text AS kind,
      s.active_count,
      s.avg_lead_days,
      s.actions_score,
      s.speed_score,
      s.active_score,
      CASE
        WHEN s.hierarchy_level = 6 THEN s.actions_score
        ELSE ROUND(0.50 * s.actions_score + 0.30 * s.speed_score + 0.20 * s.active_score)::int
      END AS efficiency_score
    FROM scored s
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS action_count,
      COALESCE(SUM(impact_score), 0)::int AS total_score,
      COALESCE(ROUND(AVG(impact_score)), 0)::int AS avg_score,
      COALESCE(SUM(people), 0)::int AS people_impacted
    FROM action_actor
  )
  SELECT json_build_object(
    'period_days', p_period_days,
    'candidate_id', p_candidate_id,
    'deadline', v_deadline,
    'totals', json_build_object(
      'action_count', (SELECT action_count FROM totals),
      'total_score', (SELECT total_score FROM totals),
      'avg_score', (SELECT avg_score FROM totals),
      'people_impacted', (SELECT people_impacted FROM totals)
    ),
    'leaders', COALESCE((
      SELECT json_agg(row_to_json(l) ORDER BY l.efficiency_score DESC, l.name)
      FROM final_rows l
      WHERE l.hierarchy_level = 6
    ), '[]'::json),
    'micros', COALESCE((
      SELECT json_agg(row_to_json(m) ORDER BY m.hierarchy_level, m.efficiency_score DESC, m.name)
      FROM final_rows m
      WHERE m.hierarchy_level IN (4, 5)
    ), '[]'::json),
    'macros', COALESCE((
      SELECT json_agg(row_to_json(x) ORDER BY x.efficiency_score DESC, x.name)
      FROM final_rows x
      WHERE x.hierarchy_level = 3
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;