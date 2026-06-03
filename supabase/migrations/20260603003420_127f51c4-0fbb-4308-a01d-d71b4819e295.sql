
-- ============================================================
-- SECURITY HARDENING: tighten RLS across multiple tables and
-- revoke executable privileges from SECURITY DEFINER helpers.
-- ============================================================

-- ---------- profiles: restrict to own + admin ----------
DROP POLICY IF EXISTS "Profiles visíveis por autenticados" ON public.profiles;
CREATE POLICY "Próprio perfil ou admin"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- ---------- leaders: tighten ----------
DROP POLICY IF EXISTS "Leaders visible to authenticated" ON public.leaders;
CREATE POLICY "Leaders visible to authenticated"
ON public.leaders FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.can_view_by_creator_party(auth.uid(), created_by)
    OR (
      public.user_has_candidate_scope(auth.uid())
      AND candidate_id IS NOT NULL
      AND public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  )
);

DROP POLICY IF EXISTS "Authenticated update leaders" ON public.leaders;
CREATE POLICY "Update own leaders or admin"
ON public.leaders FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_by_creator_party(auth.uid(), created_by)
);

-- ---------- political_assets: tighten ----------
DROP POLICY IF EXISTS "Ativos visíveis por autenticados" ON public.political_assets;
CREATE POLICY "Ativos visíveis por autenticados"
ON public.political_assets FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (
      public.user_has_candidate_scope(auth.uid())
      AND candidate_id IS NOT NULL
      AND public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  )
);

DROP POLICY IF EXISTS "Autenticados atualizam ativos" ON public.political_assets;
CREATE POLICY "Update own ativos or admin"
ON public.political_assets FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_by_creator_party(auth.uid(), created_by)
);

-- ---------- campaign_members: tighten ----------
DROP POLICY IF EXISTS "Membros visíveis por autenticados" ON public.campaign_members;
CREATE POLICY "Membros visíveis por autenticados"
ON public.campaign_members FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_by_creator_party(auth.uid(), created_by)
  OR (
    public.user_has_candidate_scope(auth.uid())
    AND candidate_id IS NOT NULL
    AND public.can_view_candidate_record(auth.uid(), candidate_id)
  )
);

DROP POLICY IF EXISTS "Autenticados atualizam membros" ON public.campaign_members;
CREATE POLICY "Update own membros or admin"
ON public.campaign_members FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_by_creator_party(auth.uid(), created_by)
);

-- ---------- actions: restrict UPDATE ----------
DROP POLICY IF EXISTS "Autenticados atualizam ações" ON public.actions;
CREATE POLICY "Update own actions or admin"
ON public.actions FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_by_creator_party(auth.uid(), created_by)
);

-- ---------- electoral_surveys: restrict UPDATE ----------
DROP POLICY IF EXISTS "Autenticados atualizam pesquisas" ON public.electoral_surveys;
CREATE POLICY "Update own surveys or admin"
ON public.electoral_surveys FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
);

-- ---------- alerts: restrict UPDATE ----------
DROP POLICY IF EXISTS "Autenticados atualizam alertas" ON public.alerts;
CREATE POLICY "Update alerts admin or creator"
ON public.alerts FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
);

-- ---------- strategic_alerts: restrict UPDATE ----------
DROP POLICY IF EXISTS "Authenticated can update strategic alerts" ON public.strategic_alerts;
CREATE POLICY "Update strategic alerts admin only"
ON public.strategic_alerts FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- ---------- user_candidates: restrict SELECT ----------
DROP POLICY IF EXISTS "Vínculos visíveis por autenticados" ON public.user_candidates;
CREATE POLICY "Próprios vínculos ou admin"
ON public.user_candidates FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ---------- user_roles: restrict SELECT ----------
DROP POLICY IF EXISTS "Authenticated read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
  END LOOP;
END$$;
CREATE POLICY "Próprias roles ou admin"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ---------- vote_projections: scope by candidate ----------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vote_projections' AND cmd IN ('SELECT','UPDATE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vote_projections', pol.policyname);
  END LOOP;
END$$;

CREATE POLICY "Projections visíveis por escopo"
ON public.vote_projections FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR public.can_view_by_creator_party(auth.uid(), created_by)
    OR (
      public.user_has_candidate_scope(auth.uid())
      AND candidate_id IS NOT NULL
      AND public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  )
);

CREATE POLICY "Update projections admin ou criador"
ON public.vote_projections FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_by_creator_party(auth.uid(), created_by)
);

-- ---------- vote_projection_revisions: scope via projection ----------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='vote_projection_revisions' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vote_projection_revisions', pol.policyname);
  END LOOP;
END$$;
CREATE POLICY "Revisions visíveis por escopo"
ON public.vote_projection_revisions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vote_projections p
    WHERE p.id = vote_projection_revisions.projection_id
      AND (
        public.is_admin(auth.uid())
        OR p.created_by = auth.uid()
        OR public.can_view_by_creator_party(auth.uid(), p.created_by)
        OR (
          public.user_has_candidate_scope(auth.uid())
          AND p.candidate_id IS NOT NULL
          AND public.can_view_candidate_record(auth.uid(), p.candidate_id)
        )
      )
  )
);

-- ---------- tracking_ai_messages: candidate-scoped ----------
DROP POLICY IF EXISTS "Mensagens visíveis por autenticados" ON public.tracking_ai_messages;
DROP POLICY IF EXISTS "Admin gerencia mensagens" ON public.tracking_ai_messages;
CREATE POLICY "Mensagens visíveis por escopo"
ON public.tracking_ai_messages FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_candidate_record(auth.uid(), candidate_id)
);
CREATE POLICY "Mensagens inseridas pelo próprio"
ON public.tracking_ai_messages FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND public.can_view_candidate_record(auth.uid(), candidate_id)
);
CREATE POLICY "Admin gerencia mensagens"
ON public.tracking_ai_messages FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- Revoke SECURITY DEFINER helpers from anon ----------
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_party(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_by_creator_party(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_party_record(uuid, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_creator_record(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_candidate_record(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_has_candidate_scope(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_candidate_ids(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_kpis() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_tracking_evolution(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_party(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_by_creator_party(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_party_record(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_creator_record(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_candidate_record(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_candidate_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_candidate_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tracking_evolution(uuid) TO authenticated;
