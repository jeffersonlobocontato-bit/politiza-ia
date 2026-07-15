CREATE OR REPLACE FUNCTION public.get_productivity_ranking(p_candidate_id uuid DEFAULT NULL::uuid, p_period_days integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_cutoff timestamptz := CASE WHEN p_period_days IS NULL OR p_period_days <= 0
                               THEN '1900-01-01'::timestamptz
                               ELSE now() - (p_period_days || ' days')::interval END;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  WITH scored_actions AS (
    SELECT a.id, a.created_by, a.impact_score, a.executed_people_count,
           a.macroregion_id AS action_macro, a.municipality AS action_city
    FROM public.actions a
    WHERE a.deleted_at IS NULL
      AND a.impact_score IS NOT NULL
      AND a.created_at >= v_cutoff
      AND (p_candidate_id IS NULL OR a.candidate_id = p_candidate_id)
  ),
  action_to_leader AS (
    SELECT sa.id AS action_id,
           sa.impact_score,
           COALESCE(sa.executed_people_count, 0) AS people,
           l.id AS leader_id,
           l.name AS leader_name,
           l.coordinator_id,
           COALESCE(l.macroregion_id, sa.action_macro) AS macro_id
    FROM scored_actions sa
    LEFT JOIN public.leaders l
      ON l.created_by = sa.created_by
     AND l.deleted_at IS NULL
     AND (p_candidate_id IS NULL OR l.candidate_id IS NULL OR l.candidate_id = p_candidate_id)
  ),
  coord_resolved AS (
    SELECT atl.*,
           micro_cm.id AS micro_id,
           micro_cm.name AS micro_name,
           COALESCE(macro_cm.id, micro_cm.supervisor_id) AS macro_member_id
    FROM action_to_leader atl
    LEFT JOIN public.campaign_members micro_cm
      ON micro_cm.id = atl.coordinator_id
    LEFT JOIN public.campaign_members macro_cm
      ON macro_cm.id = micro_cm.supervisor_id
  ),
  final_rows AS (
    SELECT cr.*,
           mm.name AS macro_name,
           mm.macroregion_id AS macro_member_region,
           mr.name AS macroregion_name
    FROM coord_resolved cr
    LEFT JOIN public.campaign_members mm ON mm.id = cr.macro_member_id
    LEFT JOIN public.macroregions mr ON mr.id = cr.macro_id
  ),
  leaders_agg AS (
    SELECT leader_id::text AS id,
           MAX(leader_name) AS name,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           SUM(people)::int AS people_impacted
    FROM final_rows
    WHERE leader_id IS NOT NULL
    GROUP BY leader_id
  ),
  micros_agg AS (
    SELECT micro_id::text AS id,
           MAX(micro_name) AS name,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           COUNT(DISTINCT leader_id)::int AS leader_count,
           SUM(people)::int AS people_impacted
    FROM final_rows
    WHERE micro_id IS NOT NULL
    GROUP BY micro_id
  ),
  macros_member_agg AS (
    SELECT macro_member_id::text AS id,
           MAX(macro_name) AS name,
           'coordenador'::text AS kind,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           COUNT(DISTINCT leader_id)::int AS leader_count,
           SUM(people)::int AS people_impacted
    FROM final_rows
    WHERE macro_member_id IS NOT NULL
    GROUP BY macro_member_id
  ),
  macros_region_agg AS (
    SELECT ('region:' || macro_id::text) AS id,
           MAX(macroregion_name) AS name,
           'regiao'::text AS kind,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           COUNT(DISTINCT leader_id)::int AS leader_count,
           SUM(people)::int AS people_impacted
    FROM final_rows
    WHERE macro_member_id IS NULL
      AND macro_id IS NOT NULL
    GROUP BY macro_id
  ),
  macros_all AS (
    SELECT * FROM macros_member_agg
    UNION ALL
    SELECT * FROM macros_region_agg
  )
  SELECT json_build_object(
    'period_days', p_period_days,
    'candidate_id', p_candidate_id,
    'totals', json_build_object(
      'action_count', (SELECT COUNT(*) FROM scored_actions),
      'total_score', (SELECT COALESCE(SUM(impact_score), 0) FROM scored_actions),
      'avg_score', (SELECT COALESCE(ROUND(AVG(impact_score)), 0) FROM scored_actions),
      'people_impacted', (SELECT COALESCE(SUM(executed_people_count), 0) FROM scored_actions)
    ),
    'leaders', COALESCE((SELECT json_agg(row_to_json(l) ORDER BY l.total_score DESC) FROM leaders_agg l), '[]'::json),
    'micros',  COALESCE((SELECT json_agg(row_to_json(m) ORDER BY m.total_score DESC) FROM micros_agg m), '[]'::json),
    'macros',  COALESCE((SELECT json_agg(row_to_json(x) ORDER BY x.total_score DESC) FROM macros_all x), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;