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
  -- Todas as lideranças (mesmo sem ações)
  all_leaders AS (
    SELECT l.id, l.name, l.coordinator_id, l.macroregion_id, l.created_by
    FROM public.leaders l
    WHERE l.deleted_at IS NULL
      AND (p_candidate_id IS NULL OR l.candidate_id IS NULL OR l.candidate_id = p_candidate_id)
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
    LEFT JOIN all_leaders l ON l.created_by = sa.created_by
  ),
  coord_resolved AS (
    SELECT atl.*,
           micro_cm.id AS micro_id,
           micro_cm.name AS micro_name,
           COALESCE(macro_cm.id, micro_cm.supervisor_id) AS macro_member_id
    FROM action_to_leader atl
    LEFT JOIN public.campaign_members micro_cm ON micro_cm.id = atl.coordinator_id
    LEFT JOIN public.campaign_members macro_cm ON macro_cm.id = micro_cm.supervisor_id
  ),
  final_rows AS (
    SELECT cr.*,
           mm.name AS macro_name,
           mr.name AS macroregion_name
    FROM coord_resolved cr
    LEFT JOIN public.campaign_members mm ON mm.id = cr.macro_member_id
    LEFT JOIN public.macroregions mr ON mr.id = cr.macro_id
  ),
  -- Agregação por liderança a partir das ações
  leader_stats AS (
    SELECT leader_id,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           SUM(people)::int AS people_impacted
    FROM final_rows
    WHERE leader_id IS NOT NULL
    GROUP BY leader_id
  ),
  leaders_agg AS (
    SELECT al.id::text AS id,
           al.name,
           COALESCE(ls.total_score, 0) AS total_score,
           COALESCE(ls.avg_score, 0) AS avg_score,
           COALESCE(ls.action_count, 0) AS action_count,
           COALESCE(ls.people_impacted, 0) AS people_impacted
    FROM all_leaders al
    LEFT JOIN leader_stats ls ON ls.leader_id = al.id
  ),
  -- Micros: todos coordenadores municipais (nível 5) + qualquer micro_id vindo das ações
  all_micros AS (
    SELECT cm.id, cm.name
    FROM public.campaign_members cm
    WHERE cm.status = 'ativo'
      AND cm.hierarchy_level = 5
      AND (p_candidate_id IS NULL OR cm.candidate_id IS NULL OR cm.candidate_id = p_candidate_id)
    UNION
    SELECT cm.id, cm.name
    FROM public.campaign_members cm
    WHERE cm.id IN (SELECT DISTINCT micro_id FROM final_rows WHERE micro_id IS NOT NULL)
  ),
  micro_stats AS (
    SELECT micro_id AS id,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           COUNT(DISTINCT leader_id)::int AS leader_count,
           SUM(people)::int AS people_impacted
    FROM final_rows
    WHERE micro_id IS NOT NULL
    GROUP BY micro_id
  ),
  micro_leader_counts AS (
    SELECT cm.id AS micro_id, COUNT(l.id)::int AS leader_count
    FROM public.campaign_members cm
    LEFT JOIN all_leaders l ON l.coordinator_id = cm.id
    WHERE cm.hierarchy_level = 5
    GROUP BY cm.id
  ),
  micros_agg AS (
    SELECT am.id::text AS id,
           am.name,
           COALESCE(ms.total_score, 0) AS total_score,
           COALESCE(ms.avg_score, 0) AS avg_score,
           COALESCE(ms.action_count, 0) AS action_count,
           COALESCE(ms.leader_count, mlc.leader_count, 0) AS leader_count,
           COALESCE(ms.people_impacted, 0) AS people_impacted
    FROM all_micros am
    LEFT JOIN micro_stats ms ON ms.id = am.id
    LEFT JOIN micro_leader_counts mlc ON mlc.micro_id = am.id
  ),
  -- Macros: todos coordenadores regionais (nível 3)
  all_macros AS (
    SELECT cm.id, cm.name
    FROM public.campaign_members cm
    WHERE cm.status = 'ativo'
      AND cm.hierarchy_level = 3
      AND (p_candidate_id IS NULL OR cm.candidate_id IS NULL OR cm.candidate_id = p_candidate_id)
    UNION
    SELECT cm.id, cm.name
    FROM public.campaign_members cm
    WHERE cm.id IN (SELECT DISTINCT macro_member_id FROM final_rows WHERE macro_member_id IS NOT NULL)
  ),
  macro_stats AS (
    SELECT macro_member_id AS id,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           COUNT(DISTINCT leader_id)::int AS leader_count,
           SUM(people)::int AS people_impacted
    FROM final_rows
    WHERE macro_member_id IS NOT NULL
    GROUP BY macro_member_id
  ),
  macro_leader_counts AS (
    SELECT macro_cm.id AS macro_id, COUNT(DISTINCT l.id)::int AS leader_count
    FROM public.campaign_members macro_cm
    LEFT JOIN public.campaign_members micro_cm ON micro_cm.supervisor_id = macro_cm.id
    LEFT JOIN all_leaders l ON l.coordinator_id = micro_cm.id
    WHERE macro_cm.hierarchy_level = 3
    GROUP BY macro_cm.id
  ),
  macros_member_agg AS (
    SELECT am.id::text AS id,
           am.name,
           'coordenador'::text AS kind,
           COALESCE(ms.total_score, 0) AS total_score,
           COALESCE(ms.avg_score, 0) AS avg_score,
           COALESCE(ms.action_count, 0) AS action_count,
           COALESCE(ms.leader_count, mlc.leader_count, 0) AS leader_count,
           COALESCE(ms.people_impacted, 0) AS people_impacted
    FROM all_macros am
    LEFT JOIN macro_stats ms ON ms.id = am.id
    LEFT JOIN macro_leader_counts mlc ON mlc.macro_id = am.id
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
    WHERE macro_member_id IS NULL AND macro_id IS NOT NULL
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
    'leaders', COALESCE((SELECT json_agg(row_to_json(l) ORDER BY l.total_score DESC, l.name) FROM leaders_agg l), '[]'::json),
    'micros',  COALESCE((SELECT json_agg(row_to_json(m) ORDER BY m.total_score DESC, m.name) FROM micros_agg m), '[]'::json),
    'macros',  COALESCE((SELECT json_agg(row_to_json(x) ORDER BY x.total_score DESC, x.name) FROM macros_all x), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;