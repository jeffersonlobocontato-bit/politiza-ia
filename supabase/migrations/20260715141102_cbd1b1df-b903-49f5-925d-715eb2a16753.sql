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
  v_deadline date := '2026-10-04'::date;
  v_project_start date := '2026-01-01'::date;
  v_speed_window numeric := GREATEST(1, (v_deadline - v_project_start));
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  WITH scored_actions AS (
    SELECT a.id, a.created_by, a.impact_score, a.executed_people_count,
           a.macroregion_id AS action_macro, a.municipality AS action_city,
           a.created_at
    FROM public.actions a
    WHERE a.deleted_at IS NULL
      AND a.impact_score IS NOT NULL
      AND a.created_at >= v_cutoff
      AND (p_candidate_id IS NULL OR a.candidate_id = p_candidate_id)
  ),
  first_action_by_user AS (
    SELECT created_by AS user_id, MIN(created_at)::date AS first_action_date
    FROM public.actions
    WHERE deleted_at IS NULL AND created_by IS NOT NULL
      AND (p_candidate_id IS NULL OR candidate_id = p_candidate_id)
    GROUP BY created_by
  ),
  all_leaders AS (
    SELECT l.id, l.name, l.coordinator_id, l.macroregion_id, l.created_by, l.status
    FROM public.leaders l
    WHERE l.deleted_at IS NULL
      AND (p_candidate_id IS NULL OR l.candidate_id IS NULL OR l.candidate_id = p_candidate_id)
  ),
  -- Resolve created_by -> campaign_member (via user_id, email or full_name)
  creator_to_member AS (
    SELECT DISTINCT ON (p.id)
           p.id AS user_id,
           cm.id AS member_id,
           cm.hierarchy_level,
           cm.supervisor_id
    FROM public.profiles p
    JOIN public.campaign_members cm
      ON cm.user_id = p.id
      OR (cm.email IS NOT NULL AND p.email IS NOT NULL AND lower(cm.email) = lower(p.email))
      OR (cm.name  IS NOT NULL AND p.full_name IS NOT NULL AND lower(cm.name)  = lower(p.full_name))
    WHERE cm.status = 'ativo'
    ORDER BY p.id, cm.hierarchy_level
  ),
  action_to_leader AS (
    SELECT sa.id AS action_id,
           sa.created_by,
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
           -- If the action creator IS a micro coordinator, that member becomes the micro
           COALESCE(micro_cm.id, direct_micro.id) AS micro_id,
           COALESCE(micro_cm.name, direct_micro.name) AS micro_name,
           -- Macro member: from leader chain, from direct-macro creator, or from direct-micro's supervisor
           COALESCE(
             macro_cm.id,
             micro_cm.supervisor_id,
             direct_macro.id,
             direct_micro.supervisor_id
           ) AS macro_member_id
    FROM action_to_leader atl
    LEFT JOIN creator_to_member ctm ON ctm.user_id = atl.created_by
    LEFT JOIN public.campaign_members micro_cm ON micro_cm.id = atl.coordinator_id
    LEFT JOIN public.campaign_members macro_cm ON macro_cm.id = micro_cm.supervisor_id
    LEFT JOIN public.campaign_members direct_micro
      ON ctm.hierarchy_level = 5 AND direct_micro.id = ctm.member_id
    LEFT JOIN public.campaign_members direct_macro
      ON ctm.hierarchy_level = 3 AND direct_macro.id = ctm.member_id
  ),
  final_rows AS (
    SELECT cr.*,
           mm.name AS macro_name,
           mr.name AS macroregion_name
    FROM coord_resolved cr
    LEFT JOIN public.campaign_members mm ON mm.id = cr.macro_member_id
    LEFT JOIN public.macroregions mr ON mr.id = cr.macro_id
  ),

  ------------------------------------------------------------------
  -- LEADERS
  ------------------------------------------------------------------
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
  leaders_base AS (
    SELECT al.id::text AS id,
           al.name,
           COALESCE(ls.total_score, 0) AS total_score,
           COALESCE(ls.avg_score, 0) AS avg_score,
           COALESCE(ls.action_count, 0) AS action_count,
           COALESCE(ls.people_impacted, 0) AS people_impacted
    FROM all_leaders al
    LEFT JOIN leader_stats ls ON ls.leader_id = al.id
  ),
  leaders_max AS (
    SELECT NULLIF(MAX(action_count), 0)::numeric AS max_actions FROM leaders_base
  ),
  leaders_agg AS (
    SELECT lb.id, lb.name, lb.total_score, lb.avg_score, lb.action_count,
           lb.people_impacted,
           NULL::int AS leader_count,
           0 AS active_count,
           0 AS avg_lead_days,
           ROUND(COALESCE(lb.action_count::numeric / lm.max_actions * 100, 0))::int AS actions_score,
           0 AS speed_score,
           0 AS active_score,
           ROUND(COALESCE(lb.action_count::numeric / lm.max_actions * 100, 0))::int AS efficiency_score
    FROM leaders_base lb CROSS JOIN leaders_max lm
  ),

  ------------------------------------------------------------------
  -- MICROS
  ------------------------------------------------------------------
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
  micro_active_leaders AS (
    SELECT l.coordinator_id AS micro_id,
           COUNT(*)::int AS active_count,
           AVG(GREATEST(0, v_deadline - fau.first_action_date))::numeric AS avg_lead_days
    FROM all_leaders l
    JOIN first_action_by_user fau ON fau.user_id = l.created_by
    WHERE l.status = 'ativo' AND l.coordinator_id IS NOT NULL
    GROUP BY l.coordinator_id
  ),
  micros_base AS (
    SELECT am.id::text AS id,
           am.name,
           COALESCE(ms.total_score, 0) AS total_score,
           COALESCE(ms.avg_score, 0) AS avg_score,
           COALESCE(ms.action_count, 0) AS action_count,
           COALESCE(ms.leader_count, mlc.leader_count, 0) AS leader_count,
           COALESCE(ms.people_impacted, 0) AS people_impacted,
           COALESCE(mal.active_count, 0) AS active_count,
           COALESCE(ROUND(mal.avg_lead_days)::int, 0) AS avg_lead_days
    FROM all_micros am
    LEFT JOIN micro_stats ms ON ms.id = am.id
    LEFT JOIN micro_leader_counts mlc ON mlc.micro_id = am.id
    LEFT JOIN micro_active_leaders mal ON mal.micro_id = am.id
  ),
  micros_max AS (
    SELECT NULLIF(MAX(action_count), 0)::numeric AS max_actions,
           NULLIF(MAX(active_count), 0)::numeric AS max_active
    FROM micros_base
  ),
  micros_agg AS (
    SELECT mb.id, mb.name, mb.total_score, mb.avg_score, mb.action_count,
           mb.leader_count, mb.people_impacted, mb.active_count, mb.avg_lead_days,
           ROUND(COALESCE(mb.action_count::numeric / mm.max_actions * 100, 0))::int AS actions_score,
           LEAST(100, ROUND(mb.avg_lead_days::numeric / v_speed_window * 100))::int AS speed_score,
           ROUND(COALESCE(mb.active_count::numeric / mm.max_active * 100, 0))::int AS active_score,
           ROUND(
             0.50 * COALESCE(mb.action_count::numeric / mm.max_actions * 100, 0) +
             0.30 * LEAST(100, mb.avg_lead_days::numeric / v_speed_window * 100) +
             0.20 * COALESCE(mb.active_count::numeric / mm.max_active * 100, 0)
           )::int AS efficiency_score
    FROM micros_base mb CROSS JOIN micros_max mm
  ),

  ------------------------------------------------------------------
  -- MACROS
  ------------------------------------------------------------------
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
  macro_active_micros AS (
    SELECT micro.supervisor_id AS macro_id,
           COUNT(*)::int AS active_count,
           AVG(GREATEST(0, v_deadline - fau.first_action_date))::numeric AS avg_lead_days
    FROM public.campaign_members micro
    JOIN first_action_by_user fau ON fau.user_id = micro.user_id
    WHERE micro.status = 'ativo'
      AND micro.hierarchy_level = 5
      AND micro.supervisor_id IS NOT NULL
    GROUP BY micro.supervisor_id
  ),
  macros_member_base AS (
    SELECT am.id::text AS id,
           am.name,
           'coordenador'::text AS kind,
           COALESCE(ms.total_score, 0) AS total_score,
           COALESCE(ms.avg_score, 0) AS avg_score,
           COALESCE(ms.action_count, 0) AS action_count,
           COALESCE(ms.leader_count, mlc.leader_count, 0) AS leader_count,
           COALESCE(ms.people_impacted, 0) AS people_impacted,
           COALESCE(mam.active_count, 0) AS active_count,
           COALESCE(ROUND(mam.avg_lead_days)::int, 0) AS avg_lead_days
    FROM all_macros am
    LEFT JOIN macro_stats ms ON ms.id = am.id
    LEFT JOIN macro_leader_counts mlc ON mlc.macro_id = am.id
    LEFT JOIN macro_active_micros mam ON mam.macro_id = am.id
  ),
  macros_region_base AS (
    SELECT ('region:' || macro_id::text) AS id,
           MAX(macroregion_name) AS name,
           'regiao'::text AS kind,
           SUM(impact_score)::int AS total_score,
           ROUND(AVG(impact_score))::int AS avg_score,
           COUNT(*)::int AS action_count,
           COUNT(DISTINCT leader_id)::int AS leader_count,
           SUM(people)::int AS people_impacted,
           0 AS active_count,
           0 AS avg_lead_days
    FROM final_rows
    WHERE macro_member_id IS NULL AND macro_id IS NOT NULL
    GROUP BY macro_id
  ),
  macros_base AS (
    SELECT * FROM macros_member_base
    UNION ALL
    SELECT * FROM macros_region_base
  ),
  macros_max AS (
    SELECT NULLIF(MAX(action_count), 0)::numeric AS max_actions,
           NULLIF(MAX(active_count), 0)::numeric AS max_active
    FROM macros_base
  ),
  macros_all AS (
    SELECT mb.id, mb.name, mb.kind, mb.total_score, mb.avg_score, mb.action_count,
           mb.leader_count, mb.people_impacted, mb.active_count, mb.avg_lead_days,
           ROUND(COALESCE(mb.action_count::numeric / mm.max_actions * 100, 0))::int AS actions_score,
           LEAST(100, ROUND(mb.avg_lead_days::numeric / v_speed_window * 100))::int AS speed_score,
           ROUND(COALESCE(mb.active_count::numeric / mm.max_active * 100, 0))::int AS active_score,
           ROUND(
             0.50 * COALESCE(mb.action_count::numeric / mm.max_actions * 100, 0) +
             0.30 * LEAST(100, mb.avg_lead_days::numeric / v_speed_window * 100) +
             0.20 * COALESCE(mb.active_count::numeric / mm.max_active * 100, 0)
           )::int AS efficiency_score
    FROM macros_base mb CROSS JOIN macros_max mm
  )
  SELECT json_build_object(
    'period_days', p_period_days,
    'candidate_id', p_candidate_id,
    'deadline', v_deadline,
    'totals', json_build_object(
      'action_count', (SELECT COUNT(*) FROM scored_actions),
      'total_score', (SELECT COALESCE(SUM(impact_score), 0) FROM scored_actions),
      'avg_score', (SELECT COALESCE(ROUND(AVG(impact_score)), 0) FROM scored_actions),
      'people_impacted', (SELECT COALESCE(SUM(executed_people_count), 0) FROM scored_actions)
    ),
    'leaders', COALESCE((SELECT json_agg(row_to_json(l) ORDER BY l.efficiency_score DESC, l.name) FROM leaders_agg l), '[]'::json),
    'micros',  COALESCE((SELECT json_agg(row_to_json(m) ORDER BY m.efficiency_score DESC, m.name) FROM micros_agg m), '[]'::json),
    'macros',  COALESCE((SELECT json_agg(row_to_json(x) ORDER BY x.efficiency_score DESC, x.name) FROM macros_all x), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;