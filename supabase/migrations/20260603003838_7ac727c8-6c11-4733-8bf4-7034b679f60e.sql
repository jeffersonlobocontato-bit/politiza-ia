
-- 1. Tighten can_view_party_record: remove the NULL-party bypass
CREATE OR REPLACE FUNCTION public.can_view_party_record(_user_id uuid, _record_party text, _created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_admin(_user_id)
    OR _created_by = _user_id
    OR (
      _record_party IS NOT NULL
      AND public.get_user_party(_user_id) IS NOT NULL
      AND lower(trim(_record_party)) = lower(public.get_user_party(_user_id))
    );
$$;

-- 2. Candidates: explicit scope (admin OR creator OR same party OR linked)
DROP POLICY IF EXISTS "Candidatos visíveis por autenticados" ON public.candidates;
CREATE POLICY "Candidatos visíveis por escopo"
ON public.candidates FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_party_record(auth.uid(), party, created_by)
  OR EXISTS (
    SELECT 1 FROM public.user_candidates uc
    WHERE uc.user_id = auth.uid() AND uc.candidate_id = candidates.id
  )
);

-- 3. Leaders: require explicit scope, no implicit access for null-party users
DROP POLICY IF EXISTS "Leaders visible to authenticated" ON public.leaders;
CREATE POLICY "Leaders visible by scope"
ON public.leaders FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (
      public.get_user_party(auth.uid()) IS NOT NULL
      AND public.can_view_by_creator_party(auth.uid(), created_by)
    )
    OR (
      candidate_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_candidates uc
        WHERE uc.user_id = auth.uid() AND uc.candidate_id = leaders.candidate_id
      )
    )
  )
);

-- 4. Political assets: same tightening
DROP POLICY IF EXISTS "Ativos visíveis por autenticados" ON public.political_assets;
CREATE POLICY "Ativos visíveis por escopo"
ON public.political_assets FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (
      candidate_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_candidates uc
        WHERE uc.user_id = auth.uid() AND uc.candidate_id = political_assets.candidate_id
      )
    )
  )
);

-- 5. Campaign members: same tightening
DROP POLICY IF EXISTS "Membros visíveis por autenticados" ON public.campaign_members;
CREATE POLICY "Membros visíveis por escopo"
ON public.campaign_members FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    public.get_user_party(auth.uid()) IS NOT NULL
    AND public.can_view_by_creator_party(auth.uid(), created_by)
  )
  OR (
    candidate_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = campaign_members.candidate_id
    )
  )
);

-- 6. tracking_interviewers INSERT: admin only
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tracking_interviewers' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tracking_interviewers', pol.policyname);
  END LOOP;
END$$;
CREATE POLICY "Admin cria entrevistadores"
ON public.tracking_interviewers FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 7. action_history: scope by parent action
DROP POLICY IF EXISTS "Histórico visível por autenticados" ON public.action_history;
DROP POLICY IF EXISTS "Autenticados inserem histórico" ON public.action_history;
CREATE POLICY "Histórico visível por escopo"
ON public.action_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_history.action_id
      AND a.deleted_at IS NULL
      AND (
        public.is_admin(auth.uid())
        OR a.created_by = auth.uid()
        OR public.can_view_by_creator_party(auth.uid(), a.created_by)
        OR (
          a.candidate_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.user_candidates uc
            WHERE uc.user_id = auth.uid() AND uc.candidate_id = a.candidate_id
          )
        )
      )
  )
);
CREATE POLICY "Histórico inserido por escopo"
ON public.action_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.actions a
    WHERE a.id = action_history.action_id
      AND (
        public.is_admin(auth.uid())
        OR a.created_by = auth.uid()
        OR public.can_view_by_creator_party(auth.uid(), a.created_by)
      )
  )
);

-- 8. leader_party_history: writes scoped to admin or leader creator
DROP POLICY IF EXISTS "Authenticated create party history" ON public.leader_party_history;
DROP POLICY IF EXISTS "Authenticated update party history" ON public.leader_party_history;
DROP POLICY IF EXISTS "Authenticated delete party history" ON public.leader_party_history;
CREATE POLICY "Party history insert by scope"
ON public.leader_party_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_party_history.leader_id
      AND (public.is_admin(auth.uid()) OR l.created_by = auth.uid() OR public.can_view_by_creator_party(auth.uid(), l.created_by))
  )
);
CREATE POLICY "Party history update by scope"
ON public.leader_party_history FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_party_history.leader_id
      AND (public.is_admin(auth.uid()) OR l.created_by = auth.uid() OR public.can_view_by_creator_party(auth.uid(), l.created_by))
  )
);
CREATE POLICY "Party history delete by scope"
ON public.leader_party_history FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_party_history.leader_id
      AND (public.is_admin(auth.uid()) OR l.created_by = auth.uid() OR public.can_view_by_creator_party(auth.uid(), l.created_by))
  )
);

-- 9. leader_political_history: scoped writes
DROP POLICY IF EXISTS "Authenticated create political history" ON public.leader_political_history;
DROP POLICY IF EXISTS "Authenticated update political history" ON public.leader_political_history;
CREATE POLICY "Political history insert by scope"
ON public.leader_political_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_political_history.leader_id
      AND (public.is_admin(auth.uid()) OR l.created_by = auth.uid() OR public.can_view_by_creator_party(auth.uid(), l.created_by))
  )
);
CREATE POLICY "Political history update by scope"
ON public.leader_political_history FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_political_history.leader_id
      AND (public.is_admin(auth.uid()) OR l.created_by = auth.uid() OR public.can_view_by_creator_party(auth.uid(), l.created_by))
  )
);

-- 10. leadership_profiles: admin only writes
DROP POLICY IF EXISTS "Admin cria perfis" ON public.leadership_profiles;
DROP POLICY IF EXISTS "Admin atualiza perfis" ON public.leadership_profiles;
CREATE POLICY "Admin cria perfis"
ON public.leadership_profiles FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin atualiza perfis"
ON public.leadership_profiles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- 11. strategic_alerts: admin-only insert
DROP POLICY IF EXISTS "Authenticated can insert strategic alerts" ON public.strategic_alerts;
CREATE POLICY "Admin insere strategic alerts"
ON public.strategic_alerts FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 12. tracking_ai_alerts: admin-only insert
DROP POLICY IF EXISTS "Sistema insere alertas tracking" ON public.tracking_ai_alerts;
CREATE POLICY "Admin insere alertas tracking"
ON public.tracking_ai_alerts FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 13. tracking_ai_insights: admin-only insert
DROP POLICY IF EXISTS "Sistema insere insights" ON public.tracking_ai_insights;
CREATE POLICY "Admin insere insights"
ON public.tracking_ai_insights FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 14. tracking-knowledge storage: scope reads by candidate link
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN ('Authenticated read knowledge','Tracking knowledge read by scope')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;
CREATE POLICY "Tracking knowledge read by scope"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tracking-knowledge' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tracking_ai_knowledge k
      WHERE k.file_path = storage.objects.name
        AND (
          k.uploaded_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_candidates uc
            WHERE uc.user_id = auth.uid() AND uc.candidate_id = k.candidate_id
          )
        )
    )
  )
);
