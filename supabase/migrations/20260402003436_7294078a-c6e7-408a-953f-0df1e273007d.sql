
CREATE OR REPLACE FUNCTION public.get_tracking_evolution(p_candidate_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH round_data AS (
    SELECT r.id, r.title, r.start_date
    FROM tracking_rounds r
    WHERE r.candidate_id = p_candidate_id AND r.deleted_at IS NULL
    ORDER BY r.start_date
  ),
  select_keys AS (
    SELECT DISTINCT q.question_key
    FROM tracking_round_questions q
    JOIN round_data rd ON rd.id = q.round_id
    WHERE q.question_type = 'select'
  ),
  round_answers AS (
    SELECT rd.id as round_id, rd.title, a.answer_value, count(*) as cnt
    FROM round_data rd
    JOIN tracking_interviews ti ON ti.round_id = rd.id
    JOIN tracking_interview_answers a ON a.interview_id = ti.id
    WHERE a.question_key IN (SELECT question_key FROM select_keys)
    GROUP BY rd.id, rd.title, a.answer_value
  ),
  round_totals AS (
    SELECT round_id, sum(cnt) as total
    FROM round_answers
    GROUP BY round_id
  )
  SELECT json_agg(
    json_build_object(
      'round_id', ra.round_id,
      'round_title', ra.title,
      'candidate', ra.answer_value,
      'pct', ROUND((ra.cnt * 100.0) / NULLIF(rt.total, 0))
    ) ORDER BY rd2.start_date, ra.cnt DESC
  )
  FROM round_answers ra
  JOIN round_totals rt ON rt.round_id = ra.round_id
  JOIN round_data rd2 ON rd2.id = ra.round_id;
$$;
