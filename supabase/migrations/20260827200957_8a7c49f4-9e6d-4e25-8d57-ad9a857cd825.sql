-- asset_leadership_profiles
DROP POLICY IF EXISTS "Vínculo visível por autenticados" ON public.asset_leadership_profiles;
CREATE POLICY "Asset profiles select scoped" ON public.asset_leadership_profiles
FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.political_assets a
    WHERE a.id = asset_leadership_profiles.asset_id
      AND (a.created_by = auth.uid() OR (a.candidate_id IS NOT NULL AND can_view_candidate_record(auth.uid(), a.candidate_id)))
  )
);

-- leader_leadership_profiles
DROP POLICY IF EXISTS "Leader profiles visible" ON public.leader_leadership_profiles;
CREATE POLICY "Leader profiles select scoped" ON public.leader_leadership_profiles
FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_leadership_profiles.leader_id
      AND (l.created_by = auth.uid() OR (l.candidate_id IS NOT NULL AND can_view_candidate_record(auth.uid(), l.candidate_id)))
  )
);

-- leader_party_history
DROP POLICY IF EXISTS "Party history visible" ON public.leader_party_history;
CREATE POLICY "Party history select by scope" ON public.leader_party_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_party_history.leader_id
      AND (is_admin(auth.uid()) OR l.created_by = auth.uid() OR can_view_by_creator_party(auth.uid(), l.created_by))
  )
);

-- leader_political_history
DROP POLICY IF EXISTS "Political history visible" ON public.leader_political_history;
CREATE POLICY "Political history select by scope" ON public.leader_political_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leaders l
    WHERE l.id = leader_political_history.leader_id
      AND (is_admin(auth.uid()) OR l.created_by = auth.uid() OR can_view_by_creator_party(auth.uid(), l.created_by))
  )
);

-- electoral_surveys
DROP POLICY IF EXISTS "Pesquisas visiveis e arquivaveis por autenticados" ON public.electoral_surveys;
CREATE POLICY "Pesquisas visiveis por escopo" ON public.electoral_surveys
FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    deleted_at IS NULL AND (
      NOT user_has_candidate_scope(auth.uid())
      OR (candidate_id IS NOT NULL AND can_view_candidate_record(auth.uid(), candidate_id))
    )
  )
);

-- eventos insert scope
DROP POLICY IF EXISTS "eventos_insert" ON public.eventos;
CREATE POLICY "eventos_insert" ON public.eventos
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR candidate_id IS NULL
  OR can_view_candidate_record(auth.uid(), candidate_id)
);