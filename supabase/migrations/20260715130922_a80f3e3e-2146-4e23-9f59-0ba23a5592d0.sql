
-- 1) Função de checagem: _target está na subárvore do _manager?
CREATE OR REPLACE FUNCTION public.is_in_my_subtree(_manager uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE me AS (
    SELECT id FROM public.campaign_members WHERE user_id = _manager
  ),
  subtree AS (
    SELECT cm.id, cm.user_id
    FROM public.campaign_members cm
    WHERE cm.supervisor_id IN (SELECT id FROM me)
    UNION ALL
    SELECT cm.id, cm.user_id
    FROM public.campaign_members cm
    JOIN subtree s ON cm.supervisor_id = s.id
  )
  SELECT _target IS NOT NULL
     AND EXISTS (SELECT 1 FROM subtree WHERE user_id = _target);
$$;

-- 2) Função para o app listar todos os user_ids sob gestão (inclui o próprio)
CREATE OR REPLACE FUNCTION public.get_subtree_user_ids(_manager uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE me AS (
    SELECT id, user_id FROM public.campaign_members WHERE user_id = _manager
  ),
  subtree AS (
    SELECT cm.id, cm.user_id
    FROM public.campaign_members cm
    WHERE cm.supervisor_id IN (SELECT id FROM me)
    UNION ALL
    SELECT cm.id, cm.user_id
    FROM public.campaign_members cm
    JOIN subtree s ON cm.supervisor_id = s.id
  ),
  all_ids AS (
    SELECT _manager AS user_id
    UNION
    SELECT user_id FROM subtree WHERE user_id IS NOT NULL
  )
  SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::uuid[]) FROM all_ids;
$$;

-- 3) Policies de SELECT/UPDATE/DELETE incluindo subárvore

-- political_assets --------------------------------------------------
DROP POLICY IF EXISTS "Ativos visíveis por escopo" ON public.political_assets;
CREATE POLICY "Ativos visíveis por escopo"
ON public.political_assets FOR SELECT
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR is_in_my_subtree(auth.uid(), created_by)
    OR (candidate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = political_assets.candidate_id
    ))
  )
);

DROP POLICY IF EXISTS "Update own ativos or admin" ON public.political_assets;
CREATE POLICY "Update ativos own/subtree/admin"
ON public.political_assets FOR UPDATE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
);

DROP POLICY IF EXISTS "Delete ativos own/subtree/admin" ON public.political_assets;
CREATE POLICY "Delete ativos own/subtree/admin"
ON public.political_assets FOR DELETE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
);

-- leaders -----------------------------------------------------------
DROP POLICY IF EXISTS "Leaders visible by scope" ON public.leaders;
CREATE POLICY "Leaders visible by scope"
ON public.leaders FOR SELECT
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR is_in_my_subtree(auth.uid(), created_by)
    OR (candidate_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_candidates uc
      WHERE uc.user_id = auth.uid() AND uc.candidate_id = leaders.candidate_id
    ))
  )
);

DROP POLICY IF EXISTS "Update own leaders or admin" ON public.leaders;
CREATE POLICY "Update leaders own/subtree/admin"
ON public.leaders FOR UPDATE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
);

DROP POLICY IF EXISTS "Delete leaders own/subtree/admin" ON public.leaders;
CREATE POLICY "Delete leaders own/subtree/admin"
ON public.leaders FOR DELETE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
);

-- actions -----------------------------------------------------------
DROP POLICY IF EXISTS "Ações visíveis por autenticados" ON public.actions;
CREATE POLICY "Ações visíveis por escopo"
ON public.actions FOR SELECT
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR is_in_my_subtree(auth.uid(), created_by)
    OR can_view_by_creator_party(auth.uid(), created_by)
    OR (get_user_party(auth.uid()) IS NULL AND can_view_candidate_record(auth.uid(), candidate_id))
  )
);

DROP POLICY IF EXISTS "Update own actions or admin" ON public.actions;
CREATE POLICY "Update actions own/subtree/admin"
ON public.actions FOR UPDATE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
  OR can_view_by_creator_party(auth.uid(), created_by)
);

DROP POLICY IF EXISTS "Delete actions own/subtree/admin" ON public.actions;
CREATE POLICY "Delete actions own/subtree/admin"
ON public.actions FOR DELETE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
);

-- campaign_members --------------------------------------------------
DROP POLICY IF EXISTS "Membros visíveis por escopo" ON public.campaign_members;
CREATE POLICY "Membros visíveis por escopo"
ON public.campaign_members FOR SELECT
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
  OR is_in_my_subtree(auth.uid(), user_id)
  OR (candidate_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_candidates uc
    WHERE uc.user_id = auth.uid() AND uc.candidate_id = campaign_members.candidate_id
  ))
);

DROP POLICY IF EXISTS "Update own membros or admin" ON public.campaign_members;
CREATE POLICY "Update membros own/subtree/admin"
ON public.campaign_members FOR UPDATE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
  OR is_in_my_subtree(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Admin deleta membros" ON public.campaign_members;
CREATE POLICY "Delete membros own/subtree/admin"
ON public.campaign_members FOR DELETE
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR is_in_my_subtree(auth.uid(), created_by)
  OR is_in_my_subtree(auth.uid(), user_id)
);
