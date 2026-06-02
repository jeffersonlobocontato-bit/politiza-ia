-- Helper: returns party name ('Novo' | 'PL') if user is party gestor, else NULL
CREATE OR REPLACE FUNCTION public.get_user_party(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'gestor_estadual_novo') THEN 'Novo'
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'gestor_estadual_pl') THEN 'PL'
    ELSE NULL
  END;
$$;

-- Helper: can view a record that has a party field
CREATE OR REPLACE FUNCTION public.can_view_party_record(_user_id uuid, _record_party text, _created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR public.get_user_party(_user_id) IS NULL
    OR _created_by = _user_id
    OR (
      _record_party IS NOT NULL
      AND lower(trim(_record_party)) = lower(public.get_user_party(_user_id))
    );
$$;

-- Helper: can view a record that has NO party field (filter only by ownership)
CREATE OR REPLACE FUNCTION public.can_view_creator_record(_user_id uuid, _created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR public.get_user_party(_user_id) IS NULL
    OR _created_by = _user_id;
$$;

-- LEADERS (has current_party)
DROP POLICY IF EXISTS "Leaders visible to authenticated" ON public.leaders;
CREATE POLICY "Leaders visible to authenticated"
ON public.leaders FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.can_view_party_record(auth.uid(), current_party, created_by));

-- CANDIDATES (has party)
DROP POLICY IF EXISTS "Candidatos visíveis por autenticados" ON public.candidates;
CREATE POLICY "Candidatos visíveis por autenticados"
ON public.candidates FOR SELECT TO authenticated
USING (public.can_view_party_record(auth.uid(), party, created_by));

-- POLITICAL_ASSETS (no party field → ownership only)
DROP POLICY IF EXISTS "Ativos visíveis por autenticados" ON public.political_assets;
CREATE POLICY "Ativos visíveis por autenticados"
ON public.political_assets FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.can_view_creator_record(auth.uid(), created_by));

-- ACTIONS (no party field → ownership only)
DROP POLICY IF EXISTS "Ações visíveis por autenticados" ON public.actions;
CREATE POLICY "Ações visíveis por autenticados"
ON public.actions FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.can_view_creator_record(auth.uid(), created_by));

-- CAMPAIGN_MEMBERS (no party field → ownership only)
DROP POLICY IF EXISTS "Membros visíveis por autenticados" ON public.campaign_members;
CREATE POLICY "Membros visíveis por autenticados"
ON public.campaign_members FOR SELECT TO authenticated
USING (public.can_view_creator_record(auth.uid(), created_by));

-- ELECTORAL_SURVEYS (no party field → ownership only)
DROP POLICY IF EXISTS "Pesquisas visíveis por autenticados" ON public.electoral_surveys;
CREATE POLICY "Pesquisas visíveis por autenticados"
ON public.electoral_surveys FOR SELECT TO authenticated
USING (deleted_at IS NULL AND public.can_view_creator_record(auth.uid(), created_by));