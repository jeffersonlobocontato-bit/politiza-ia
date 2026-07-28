
-- 1. emendas SELECT scoped
DROP POLICY IF EXISTS emendas_select ON public.emendas;
CREATE POLICY emendas_select ON public.emendas
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  );

-- 2. eventos SELECT: public for published, scoped otherwise
DROP POLICY IF EXISTS eventos_select_public ON public.eventos;
CREATE POLICY eventos_select_published ON public.eventos
  FOR SELECT TO anon, authenticated
  USING (status = 'publicado'::evento_status);

CREATE POLICY eventos_select_scoped ON public.eventos
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  );

-- 3. political_assets INSERT: enforce ownership + candidate scope
DROP POLICY IF EXISTS "Autenticados criam ativos" ON public.political_assets;
CREATE POLICY "political_assets_insert_scoped" ON public.political_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_admin(auth.uid())
      OR NOT public.user_has_candidate_scope(auth.uid())
      OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
    )
  );

-- 4. junction tables INSERT: require ownership of referenced campaign_member
DROP POLICY IF EXISTS cma_insert ON public.campaign_member_associations;
CREATE POLICY cma_insert ON public.campaign_member_associations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.id = campaign_member_associations.member_id
        AND (
          public.is_admin(auth.uid())
          OR cm.created_by = auth.uid()
          OR public.is_auditor_hierarquia(auth.uid())
          OR public.is_in_my_subtree(auth.uid(), cm.user_id)
        )
    )
  );

DROP POLICY IF EXISTS cmlp_insert ON public.campaign_member_leadership_profiles;
CREATE POLICY cmlp_insert ON public.campaign_member_leadership_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.id = campaign_member_leadership_profiles.member_id
        AND (
          public.is_admin(auth.uid())
          OR cm.created_by = auth.uid()
          OR public.is_auditor_hierarquia(auth.uid())
          OR public.is_in_my_subtree(auth.uid(), cm.user_id)
        )
    )
  );

DROP POLICY IF EXISTS cmm_insert ON public.campaign_member_macroregions;
CREATE POLICY cmm_insert ON public.campaign_member_macroregions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_members cm
      WHERE cm.id = campaign_member_macroregions.member_id
        AND (
          public.is_admin(auth.uid())
          OR cm.created_by = auth.uid()
          OR public.is_auditor_hierarquia(auth.uid())
          OR public.is_in_my_subtree(auth.uid(), cm.user_id)
        )
    )
  );

-- 5. Revoke anon EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_subtree_user_ids(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_auditor_hierarquia(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_in_my_subtree(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_task_assignment() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tasks_notify_assignment() FROM anon, PUBLIC;
