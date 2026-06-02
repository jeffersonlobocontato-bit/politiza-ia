-- Helper: same-party-as-creator visibility
CREATE OR REPLACE FUNCTION public.can_view_by_creator_party(_user_id uuid, _created_by uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_admin(_user_id)
    OR _created_by = _user_id
    OR (
      public.get_user_party(_user_id) IS NOT NULL
      AND public.get_user_party(_created_by) IS NOT NULL
      AND public.get_user_party(_user_id) = public.get_user_party(_created_by)
    );
$$;

-- ===== electoral_surveys: COMUM a todos os autenticados =====
DROP POLICY IF EXISTS "Pesquisas visíveis por autenticados" ON public.electoral_surveys;
CREATE POLICY "Pesquisas visíveis por autenticados" ON public.electoral_surveys
FOR SELECT TO authenticated
USING (deleted_at IS NULL);

-- ===== political_assets: APENAS criador (admin vê tudo) =====
DROP POLICY IF EXISTS "Ativos visíveis por autenticados" ON public.political_assets;
CREATE POLICY "Ativos visíveis por autenticados" ON public.political_assets
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR created_by = auth.uid()
    OR (
      public.get_user_party(auth.uid()) IS NULL
      AND NOT public.user_has_candidate_scope(auth.uid())
    )
    OR (
      public.get_user_party(auth.uid()) IS NULL
      AND public.user_has_candidate_scope(auth.uid())
      AND public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  )
);

-- ===== actions: partido do criador OR próprio OR candidato vinculado =====
DROP POLICY IF EXISTS "Ações visíveis por autenticados" ON public.actions;
CREATE POLICY "Ações visíveis por autenticados" ON public.actions
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR public.can_view_by_creator_party(auth.uid(), created_by)
    OR (
      public.get_user_party(auth.uid()) IS NULL
      AND public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  )
);

-- ===== campaign_members: mesma regra =====
DROP POLICY IF EXISTS "Membros visíveis por autenticados" ON public.campaign_members;
CREATE POLICY "Membros visíveis por autenticados" ON public.campaign_members
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.can_view_by_creator_party(auth.uid(), created_by)
  OR (
    public.get_user_party(auth.uid()) IS NULL
    AND public.can_view_candidate_record(auth.uid(), candidate_id)
  )
);

-- ===== leaders: partido do líder OR partido do criador OR candidato =====
DROP POLICY IF EXISTS "Leaders visible to authenticated" ON public.leaders;
CREATE POLICY "Leaders visible to authenticated" ON public.leaders
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR public.can_view_party_record(auth.uid(), current_party, created_by)
    OR public.can_view_by_creator_party(auth.uid(), created_by)
    OR (
      public.get_user_party(auth.uid()) IS NULL
      AND public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  )
);

-- ===== tracking_rounds: partido do criador (admin vê tudo) =====
DROP POLICY IF EXISTS "Rodadas visíveis por autenticados" ON public.tracking_rounds;
CREATE POLICY "Rodadas visíveis por autenticados" ON public.tracking_rounds
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR public.can_view_by_creator_party(auth.uid(), created_by)
    OR (
      public.get_user_party(auth.uid()) IS NULL
      AND public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  )
);

-- Permite gestores de partido criarem/editarem suas próprias rodadas
DROP POLICY IF EXISTS "Admin cria rodadas" ON public.tracking_rounds;
CREATE POLICY "Autenticados criam rodadas" ON public.tracking_rounds
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.get_user_party(auth.uid()) IS NOT NULL
);

DROP POLICY IF EXISTS "Admin atualiza rodadas" ON public.tracking_rounds;
CREATE POLICY "Autenticados atualizam rodadas" ON public.tracking_rounds
FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR created_by = auth.uid()
  OR public.can_view_by_creator_party(auth.uid(), created_by)
);

-- ===== tracking_round_questions: gestor pode gerenciar de rodadas próprias/do partido =====
DROP POLICY IF EXISTS "Admin cria perguntas" ON public.tracking_round_questions;
CREATE POLICY "Autenticados criam perguntas" ON public.tracking_round_questions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tracking_rounds r
    WHERE r.id = round_id AND (
      public.is_admin(auth.uid())
      OR r.created_by = auth.uid()
      OR public.can_view_by_creator_party(auth.uid(), r.created_by)
    )
  )
);

DROP POLICY IF EXISTS "Admin atualiza perguntas" ON public.tracking_round_questions;
CREATE POLICY "Autenticados atualizam perguntas" ON public.tracking_round_questions
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tracking_rounds r
    WHERE r.id = round_id AND (
      public.is_admin(auth.uid())
      OR r.created_by = auth.uid()
      OR public.can_view_by_creator_party(auth.uid(), r.created_by)
    )
  )
);

DROP POLICY IF EXISTS "Admin deleta perguntas" ON public.tracking_round_questions;
CREATE POLICY "Autenticados deletam perguntas" ON public.tracking_round_questions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tracking_rounds r
    WHERE r.id = round_id AND (
      public.is_admin(auth.uid())
      OR r.created_by = auth.uid()
      OR public.can_view_by_creator_party(auth.uid(), r.created_by)
    )
  )
);
