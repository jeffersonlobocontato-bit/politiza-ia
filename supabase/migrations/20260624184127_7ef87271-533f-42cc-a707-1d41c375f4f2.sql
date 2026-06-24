DROP POLICY IF EXISTS emendas_delete ON public.emendas;
DROP POLICY IF EXISTS emendas_update ON public.emendas;

CREATE POLICY emendas_delete ON public.emendas
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY emendas_update ON public.emendas
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = created_by)
  WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = created_by);