DROP POLICY IF EXISTS "Authenticated create leaders" ON public.leaders;

CREATE POLICY "Authenticated create own leaders"
ON public.leaders
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    candidate_id IS NULL
    OR public.is_admin(auth.uid())
    OR NOT public.user_has_candidate_scope(auth.uid())
    OR public.can_view_candidate_record(auth.uid(), candidate_id)
  )
);