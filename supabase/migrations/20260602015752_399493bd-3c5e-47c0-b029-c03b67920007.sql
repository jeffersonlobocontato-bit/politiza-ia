
DROP FUNCTION IF EXISTS public.ensure_single_active_candidate() CASCADE;

CREATE TABLE IF NOT EXISTS public.user_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (user_id, candidate_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_candidates TO authenticated;
GRANT ALL ON public.user_candidates TO service_role;

ALTER TABLE public.user_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vínculos visíveis por autenticados" ON public.user_candidates;
CREATE POLICY "Vínculos visíveis por autenticados"
  ON public.user_candidates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin gerencia vínculos" ON public.user_candidates;
CREATE POLICY "Admin gerencia vínculos"
  ON public.user_candidates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_user_candidate_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(candidate_id), ARRAY[]::uuid[])
  FROM public.user_candidates WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_has_candidate_scope(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_candidates WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_view_candidate_record(_user_id uuid, _candidate_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR NOT public.user_has_candidate_scope(_user_id)
    OR _candidate_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_candidates
      WHERE user_id = _user_id AND candidate_id = _candidate_id
    );
$$;

ALTER TABLE public.actions          ADD COLUMN IF NOT EXISTS candidate_id uuid;
ALTER TABLE public.political_assets ADD COLUMN IF NOT EXISTS candidate_id uuid;
ALTER TABLE public.campaign_members ADD COLUMN IF NOT EXISTS candidate_id uuid;
ALTER TABLE public.electoral_surveys ADD COLUMN IF NOT EXISTS candidate_id uuid;

CREATE INDEX IF NOT EXISTS idx_actions_candidate            ON public.actions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_political_assets_candidate   ON public.political_assets(candidate_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_candidate   ON public.campaign_members(candidate_id);
CREATE INDEX IF NOT EXISTS idx_electoral_surveys_candidate  ON public.electoral_surveys(candidate_id);
CREATE INDEX IF NOT EXISTS idx_leaders_candidate            ON public.leaders(candidate_id);

DROP POLICY IF EXISTS "Leaders visible to authenticated" ON public.leaders;
CREATE POLICY "Leaders visible to authenticated"
  ON public.leaders FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.can_view_party_record(auth.uid(), current_party, created_by)
      OR public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  );

DROP POLICY IF EXISTS "Ações visíveis por autenticados" ON public.actions;
CREATE POLICY "Ações visíveis por autenticados"
  ON public.actions FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.can_view_creator_record(auth.uid(), created_by)
      OR public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  );

DROP POLICY IF EXISTS "Ativos visíveis por autenticados" ON public.political_assets;
CREATE POLICY "Ativos visíveis por autenticados"
  ON public.political_assets FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.can_view_creator_record(auth.uid(), created_by)
      OR public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  );

DROP POLICY IF EXISTS "Membros visíveis por autenticados" ON public.campaign_members;
CREATE POLICY "Membros visíveis por autenticados"
  ON public.campaign_members FOR SELECT TO authenticated
  USING (
    public.can_view_creator_record(auth.uid(), created_by)
    OR public.can_view_candidate_record(auth.uid(), candidate_id)
  );

DROP POLICY IF EXISTS "Pesquisas visíveis por autenticados" ON public.electoral_surveys;
CREATE POLICY "Pesquisas visíveis por autenticados"
  ON public.electoral_surveys FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.can_view_creator_record(auth.uid(), created_by)
      OR public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  );

DROP POLICY IF EXISTS "Candidatos visíveis por autenticados" ON public.candidates;
CREATE POLICY "Candidatos visíveis por autenticados"
  ON public.candidates FOR SELECT TO authenticated
  USING (
    public.can_view_party_record(auth.uid(), party, created_by)
    OR public.can_view_candidate_record(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Rodadas visíveis por autenticados" ON public.tracking_rounds;
CREATE POLICY "Rodadas visíveis por autenticados"
  ON public.tracking_rounds FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.can_view_candidate_record(auth.uid(), candidate_id)
  );
