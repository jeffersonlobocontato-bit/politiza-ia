CREATE POLICY "Auditor hierarquia cria membros N3-N5"
ON public.campaign_members
FOR INSERT
TO authenticated
WITH CHECK (
  is_auditor_hierarquia(auth.uid())
  AND created_by = auth.uid()
  AND hierarchy_level = ANY (ARRAY[3,4,5])
);