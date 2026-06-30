
-- ============ ACTIONS ============
DROP POLICY IF EXISTS "Autenticados criam ações" ON public.actions;
CREATE POLICY "Autenticados criam ações" ON public.actions FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.is_admin(auth.uid())
    OR NOT public.user_has_candidate_scope(auth.uid())
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  )
);

-- ============ ALERTS ============
DROP POLICY IF EXISTS "Alertas visíveis por autenticados" ON public.alerts;
CREATE POLICY "Alertas visíveis por escopo" ON public.alerts FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Autenticados inserem alertas" ON public.alerts;
CREATE POLICY "Autenticados inserem alertas" ON public.alerts FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR created_by = auth.uid());

-- ============ ASSET_LEADERSHIP_PROFILES ============
DROP POLICY IF EXISTS "Autenticados criam vínculo" ON public.asset_leadership_profiles;
DROP POLICY IF EXISTS "Autenticados deletam vínculo" ON public.asset_leadership_profiles;
CREATE POLICY "Asset profiles insert scoped" ON public.asset_leadership_profiles FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.political_assets a
    WHERE a.id = asset_id AND (a.created_by = auth.uid()
      OR (a.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), a.candidate_id)))
  )
);
CREATE POLICY "Asset profiles delete scoped" ON public.asset_leadership_profiles FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.political_assets a
    WHERE a.id = asset_id AND (a.created_by = auth.uid()
      OR (a.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), a.candidate_id)))
  )
);

-- ============ CAMPAIGN_MEMBERS ============
DROP POLICY IF EXISTS "Autenticados criam membros" ON public.campaign_members;
CREATE POLICY "Autenticados criam membros" ON public.campaign_members FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.is_admin(auth.uid())
    OR NOT public.user_has_candidate_scope(auth.uid())
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  )
);
DROP POLICY IF EXISTS "Membros visíveis por escopo" ON public.campaign_members;
CREATE POLICY "Membros visíveis por escopo" ON public.campaign_members FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (candidate_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_candidates uc
    WHERE uc.user_id = auth.uid() AND uc.candidate_id = campaign_members.candidate_id
  ))
);

-- ============ ELECTORAL_SURVEYS ============
DROP POLICY IF EXISTS "Autenticados criam pesquisas" ON public.electoral_surveys;
CREATE POLICY "Autenticados criam pesquisas" ON public.electoral_surveys FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.is_admin(auth.uid())
    OR NOT public.user_has_candidate_scope(auth.uid())
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  )
);

-- ============ EMENDAS ============
DROP POLICY IF EXISTS "emendas_insert" ON public.emendas;
CREATE POLICY "emendas_insert" ON public.emendas FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.is_admin(auth.uid())
    OR NOT public.user_has_candidate_scope(auth.uid())
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  )
);

-- ============ FISCALIZE_REPORTS ============
DROP POLICY IF EXISTS "fiscalize_select" ON public.fiscalize_reports;
CREATE POLICY "fiscalize_select" ON public.fiscalize_reports FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'juridico'::app_role)
    OR created_by = auth.uid()
  )
);

-- ============ INSCRICOES ============
DROP POLICY IF EXISTS "inscricoes_insert_public" ON public.inscricoes;
CREATE POLICY "inscricoes_insert_public" ON public.inscricoes FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_id AND e.status = 'publicado')
);
DROP POLICY IF EXISTS "inscricoes_select_internal" ON public.inscricoes;
CREATE POLICY "inscricoes_select_internal" ON public.inscricoes FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = evento_id AND (
      e.created_by = auth.uid()
      OR (e.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), e.candidate_id))
    )
  )
);
DROP POLICY IF EXISTS "inscricoes_update_internal" ON public.inscricoes;
CREATE POLICY "inscricoes_update_internal" ON public.inscricoes FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.eventos e
    WHERE e.id = evento_id AND (
      e.created_by = auth.uid()
      OR (e.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), e.candidate_id))
    )
  )
);

-- ============ LEADER_LEADERSHIP_PROFILES ============
DROP POLICY IF EXISTS "Authenticated create leader profiles" ON public.leader_leadership_profiles;
DROP POLICY IF EXISTS "Authenticated delete leader profiles" ON public.leader_leadership_profiles;
CREATE POLICY "Leader profiles insert scoped" ON public.leader_leadership_profiles FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_id AND (l.created_by = auth.uid()
      OR (l.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), l.candidate_id)))
  )
);
CREATE POLICY "Leader profiles delete scoped" ON public.leader_leadership_profiles FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_id AND (l.created_by = auth.uid()
      OR (l.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), l.candidate_id)))
  )
);

-- ============ LEADERS ============
DROP POLICY IF EXISTS "Authenticated create leaders" ON public.leaders;
CREATE POLICY "Authenticated create leaders" ON public.leaders FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.is_admin(auth.uid())
    OR NOT public.user_has_candidate_scope(auth.uid())
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  )
);
DROP POLICY IF EXISTS "Leaders visible by scope" ON public.leaders;
CREATE POLICY "Leaders visible by scope" ON public.leaders FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (candidate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = leaders.candidate_id
    ))
  )
);

-- ============ PARTY_SLATE_CANDIDATES ============
-- SELECT remains restricted to admin + party managers (already narrow). No change needed beyond confirming.

-- ============ POLITICAL_ASSETS ============
-- SELECT already candidate-scoped; ensure UPDATE also scoped (remove broad party branch in update)
DROP POLICY IF EXISTS "Update own ativos or admin" ON public.political_assets;
CREATE POLICY "Update own ativos or admin" ON public.political_assets FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid()) OR created_by = auth.uid()
  OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
);

-- ============ STRATEGIC_ALERTS ============
DROP POLICY IF EXISTS "Strategic alerts visible to authenticated" ON public.strategic_alerts;
CREATE POLICY "Strategic alerts visible to admins" ON public.strategic_alerts FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- ============ SURVEY_QUESTIONS ============
DROP POLICY IF EXISTS "Autenticados criam questões" ON public.survey_questions;
DROP POLICY IF EXISTS "Autenticados deletam questões" ON public.survey_questions;
CREATE POLICY "Survey questions insert scoped" ON public.survey_questions FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.electoral_surveys s
    WHERE s.id = survey_id AND (s.created_by = auth.uid()
      OR (s.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), s.candidate_id)))
  )
);
CREATE POLICY "Survey questions delete scoped" ON public.survey_questions FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.electoral_surveys s
    WHERE s.id = survey_id AND (s.created_by = auth.uid()
      OR (s.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), s.candidate_id)))
  )
);

-- ============ SURVEY_RESULTS ============
DROP POLICY IF EXISTS "Autenticados criam resultados" ON public.survey_results;
DROP POLICY IF EXISTS "Autenticados deletam resultados" ON public.survey_results;
CREATE POLICY "Survey results insert scoped" ON public.survey_results FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.survey_questions q
    JOIN public.electoral_surveys s ON s.id = q.survey_id
    WHERE q.id = question_id AND (s.created_by = auth.uid()
      OR (s.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), s.candidate_id)))
  )
);
CREATE POLICY "Survey results delete scoped" ON public.survey_results FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.survey_questions q
    JOIN public.electoral_surveys s ON s.id = q.survey_id
    WHERE q.id = question_id AND (s.created_by = auth.uid()
      OR (s.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), s.candidate_id)))
  )
);

-- ============ TRACKING_AI_KNOWLEDGE ============
DROP POLICY IF EXISTS "Knowledge visível por autenticados" ON public.tracking_ai_knowledge;
CREATE POLICY "Knowledge visível por escopo" ON public.tracking_ai_knowledge FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR uploaded_by = auth.uid()
  OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
);

-- ============ TRACKING_INTERVIEW_ANSWERS ============
DROP POLICY IF EXISTS "Autenticados inserem respostas" ON public.tracking_interview_answers;
CREATE POLICY "Interview answers insert scoped" ON public.tracking_interview_answers FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.tracking_interviews ti
    WHERE ti.id = interview_id AND ti.interviewer_id = auth.uid()
  )
);

-- ============ VOTE_PROJECTION_REVISIONS ============
DROP POLICY IF EXISTS "Authenticated create revisions" ON public.vote_projection_revisions;
CREATE POLICY "Revisions insert scoped" ON public.vote_projection_revisions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vote_projections p
    WHERE p.id = projection_id AND (
      public.is_admin(auth.uid())
      OR p.created_by = auth.uid()
      OR (p.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), p.candidate_id))
    )
  )
);

-- ============ VOTE_PROJECTIONS ============
DROP POLICY IF EXISTS "Authenticated create projections" ON public.vote_projections;
CREATE POLICY "Projections insert scoped" ON public.vote_projections FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.is_admin(auth.uid())
    OR NOT public.user_has_candidate_scope(auth.uid())
    OR (candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), candidate_id))
  )
);

-- ============ STORAGE: evento-banners ============
DROP POLICY IF EXISTS "evento_banners_insert" ON storage.objects;
DROP POLICY IF EXISTS "evento_banners_update" ON storage.objects;
DROP POLICY IF EXISTS "evento_banners_delete" ON storage.objects;
CREATE POLICY "evento_banners_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evento-banners' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.eventos e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND (e.created_by = auth.uid()
          OR (e.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), e.candidate_id)))
    )
  )
);
CREATE POLICY "evento_banners_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'evento-banners' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.eventos e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND (e.created_by = auth.uid()
          OR (e.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), e.candidate_id)))
    )
  )
);
CREATE POLICY "evento_banners_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'evento-banners' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.eventos e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND (e.created_by = auth.uid()
          OR (e.candidate_id IS NOT NULL AND public.can_view_candidate_record(auth.uid(), e.candidate_id)))
    )
  )
);

-- ============ SECURITY DEFINER VIEW ============
ALTER VIEW public.eventos_com_contagem SET (security_invoker = on);

-- ============ Revoke anon EXECUTE on internal definer functions ============
REVOKE EXECUTE ON FUNCTION public.get_delegable_members(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_campaign_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_productivity_ranking(uuid, integer) FROM PUBLIC, anon;
