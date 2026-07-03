DROP POLICY IF EXISTS "Pesquisas visíveis por autenticados" ON public.electoral_surveys;

CREATE POLICY "Pesquisas visiveis e arquivaveis por autenticados"
ON public.electoral_surveys
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  OR public.is_admin(auth.uid())
  OR created_by = auth.uid()
);
