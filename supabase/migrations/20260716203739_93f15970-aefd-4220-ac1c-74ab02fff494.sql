
-- Auditor hierarquia pode editar membros dos níveis 3, 4 e 5
CREATE POLICY "Auditor hierarquia atualiza membros N3-N5"
ON public.campaign_members
FOR UPDATE
USING (public.is_auditor_hierarquia(auth.uid()) AND hierarchy_level IN (3,4,5))
WITH CHECK (public.is_auditor_hierarquia(auth.uid()) AND hierarchy_level IN (3,4,5));

-- Vínculos: permitir UPDATE/DELETE ao auditor quando membro é N3-N5
CREATE POLICY "Auditor hierarquia atualiza cma N3-N5"
ON public.campaign_member_associations
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = campaign_member_associations.member_id AND cm.hierarchy_level IN (3,4,5)) AND public.is_auditor_hierarquia(auth.uid()))
WITH CHECK (public.is_auditor_hierarquia(auth.uid()));

CREATE POLICY "Auditor hierarquia remove cma N3-N5"
ON public.campaign_member_associations
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = campaign_member_associations.member_id AND cm.hierarchy_level IN (3,4,5)) AND public.is_auditor_hierarquia(auth.uid()));

CREATE POLICY "Auditor hierarquia atualiza cmm N3-N5"
ON public.campaign_member_macroregions
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = campaign_member_macroregions.member_id AND cm.hierarchy_level IN (3,4,5)) AND public.is_auditor_hierarquia(auth.uid()))
WITH CHECK (public.is_auditor_hierarquia(auth.uid()));

CREATE POLICY "Auditor hierarquia remove cmm N3-N5"
ON public.campaign_member_macroregions
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = campaign_member_macroregions.member_id AND cm.hierarchy_level IN (3,4,5)) AND public.is_auditor_hierarquia(auth.uid()));

CREATE POLICY "Auditor hierarquia atualiza cmlp N3-N5"
ON public.campaign_member_leadership_profiles
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = campaign_member_leadership_profiles.member_id AND cm.hierarchy_level IN (3,4,5)) AND public.is_auditor_hierarquia(auth.uid()))
WITH CHECK (public.is_auditor_hierarquia(auth.uid()));

CREATE POLICY "Auditor hierarquia remove cmlp N3-N5"
ON public.campaign_member_leadership_profiles
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = campaign_member_leadership_profiles.member_id AND cm.hierarchy_level IN (3,4,5)) AND public.is_auditor_hierarquia(auth.uid()));

CREATE POLICY "Auditor hierarquia gerencia cmmun N3-N5"
ON public.campaign_member_municipalities
FOR ALL
USING (EXISTS (SELECT 1 FROM public.campaign_members cm WHERE cm.id = campaign_member_municipalities.member_id AND cm.hierarchy_level IN (3,4,5)) AND public.is_auditor_hierarquia(auth.uid()))
WITH CHECK (public.is_auditor_hierarquia(auth.uid()));
