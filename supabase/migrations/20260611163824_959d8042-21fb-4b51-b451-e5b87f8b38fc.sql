
-- N:N: member ↔ association
CREATE TABLE public.campaign_member_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.campaign_members(id) ON DELETE CASCADE,
  association_id uuid NOT NULL REFERENCES public.municipality_associations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, association_id)
);
CREATE INDEX idx_cma_member ON public.campaign_member_associations(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_member_associations TO authenticated;
GRANT ALL ON public.campaign_member_associations TO service_role;
ALTER TABLE public.campaign_member_associations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cma_select" ON public.campaign_member_associations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id));
CREATE POLICY "cma_insert" ON public.campaign_member_associations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cma_update" ON public.campaign_member_associations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id AND (public.is_admin(auth.uid()) OR cm.created_by = auth.uid())));
CREATE POLICY "cma_delete" ON public.campaign_member_associations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id AND (public.is_admin(auth.uid()) OR cm.created_by = auth.uid())));

-- N:N: member ↔ macroregion
CREATE TABLE public.campaign_member_macroregions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.campaign_members(id) ON DELETE CASCADE,
  macroregion_id text NOT NULL REFERENCES public.macroregions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, macroregion_id)
);
CREATE INDEX idx_cmm_member ON public.campaign_member_macroregions(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_member_macroregions TO authenticated;
GRANT ALL ON public.campaign_member_macroregions TO service_role;
ALTER TABLE public.campaign_member_macroregions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmm_select" ON public.campaign_member_macroregions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id));
CREATE POLICY "cmm_insert" ON public.campaign_member_macroregions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cmm_update" ON public.campaign_member_macroregions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id AND (public.is_admin(auth.uid()) OR cm.created_by = auth.uid())));
CREATE POLICY "cmm_delete" ON public.campaign_member_macroregions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id AND (public.is_admin(auth.uid()) OR cm.created_by = auth.uid())));

-- N:N: member ↔ leadership_profile (entity for liderança)
CREATE TABLE public.campaign_member_leadership_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.campaign_members(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.leadership_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, profile_id)
);
CREATE INDEX idx_cmlp_member ON public.campaign_member_leadership_profiles(member_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_member_leadership_profiles TO authenticated;
GRANT ALL ON public.campaign_member_leadership_profiles TO service_role;
ALTER TABLE public.campaign_member_leadership_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmlp_select" ON public.campaign_member_leadership_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id));
CREATE POLICY "cmlp_insert" ON public.campaign_member_leadership_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cmlp_update" ON public.campaign_member_leadership_profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id AND (public.is_admin(auth.uid()) OR cm.created_by = auth.uid())));
CREATE POLICY "cmlp_delete" ON public.campaign_member_leadership_profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = member_id AND (public.is_admin(auth.uid()) OR cm.created_by = auth.uid())));
