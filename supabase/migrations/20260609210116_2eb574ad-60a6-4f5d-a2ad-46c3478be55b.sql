
-- 1. Remove the "no scope = see everything" bypass.
-- Now: only admins, or users explicitly linked to the candidate, can view candidate-scoped records.
-- Records with candidate_id IS NULL remain visible (handled by other policy branches).
CREATE OR REPLACE FUNCTION public.can_view_candidate_record(_user_id uuid, _candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_admin(_user_id)
    OR (
      _candidate_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_candidates
        WHERE user_id = _user_id AND candidate_id = _candidate_id
      )
    );
$$;

-- 2. Tighten campaign_members: if the viewer has candidate scope, party-match alone is not enough —
-- the record's candidate must also be in the viewer's scope. This stops PII (email/phone) leaking
-- across candidates of the same party.
DROP POLICY IF EXISTS "Membros visíveis por escopo" ON public.campaign_members;
CREATE POLICY "Membros visíveis por escopo"
ON public.campaign_members
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    -- Party-level visibility only when the viewer has no candidate restriction.
    NOT public.user_has_candidate_scope(auth.uid())
    AND public.get_user_party(auth.uid()) IS NOT NULL
    AND public.can_view_by_creator_party(auth.uid(), created_by)
  )
  OR (
    -- Scoped users: must be explicitly linked to this member's candidate.
    public.user_has_candidate_scope(auth.uid())
    AND candidate_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = campaign_members.candidate_id
    )
  )
);

-- 3. Tighten candidates SELECT analogously.
DROP POLICY IF EXISTS "Candidatos visíveis por escopo" ON public.candidates;
CREATE POLICY "Candidatos visíveis por escopo"
ON public.candidates
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    NOT public.user_has_candidate_scope(auth.uid())
    AND public.can_view_party_record(auth.uid(), party, created_by)
  )
  OR (
    public.user_has_candidate_scope(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = candidates.id
    )
  )
);
