-- Explicit WITH CHECK on electoral_surveys UPDATE policy so soft-delete
-- (setting deleted_at) succeeds for admins and the record's creator.
DROP POLICY IF EXISTS "Update own surveys or admin" ON public.electoral_surveys;
CREATE POLICY "Update own surveys or admin"
ON public.electoral_surveys FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
);