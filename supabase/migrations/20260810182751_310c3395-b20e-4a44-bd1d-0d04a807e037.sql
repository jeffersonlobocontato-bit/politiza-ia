-- Helper: visibilidade de um membro da equipe
CREATE OR REPLACE FUNCTION public.can_view_campaign_member(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members cm
    WHERE cm.id = _member_id
      AND (
        public.is_admin(_user_id)
        OR public.is_auditor_hierarquia(_user_id)
        OR cm.created_by = _user_id
        OR cm.user_id = _user_id
        OR public.is_in_my_subtree(_user_id, cm.created_by)
        OR public.is_in_my_subtree(_user_id, cm.user_id)
        OR (cm.candidate_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_candidates uc
          WHERE uc.user_id = _user_id AND uc.candidate_id = cm.candidate_id
        ))
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_campaign_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_campaign_member(uuid, uuid) TO authenticated, service_role;

-- Vínculos organizacionais
DROP POLICY IF EXISTS cma_select ON public.campaign_member_associations;
CREATE POLICY cma_select ON public.campaign_member_associations
FOR SELECT TO authenticated
USING (public.can_view_campaign_member(auth.uid(), member_id));

DROP POLICY IF EXISTS cmm_select ON public.campaign_member_macroregions;
CREATE POLICY cmm_select ON public.campaign_member_macroregions
FOR SELECT TO authenticated
USING (public.can_view_campaign_member(auth.uid(), member_id));

DROP POLICY IF EXISTS cmlp_select ON public.campaign_member_leadership_profiles;
CREATE POLICY cmlp_select ON public.campaign_member_leadership_profiles
FOR SELECT TO authenticated
USING (public.can_view_campaign_member(auth.uid(), member_id));

DROP POLICY IF EXISTS "Authenticated read member municipalities" ON public.campaign_member_municipalities;
CREATE POLICY "Authenticated read member municipalities" ON public.campaign_member_municipalities
FOR SELECT TO authenticated
USING (public.can_view_campaign_member(auth.uid(), member_id));

-- Tracking AI config
DROP POLICY IF EXISTS "Config visível por autenticados" ON public.tracking_ai_config;
CREATE POLICY "Config visível por escopo" ON public.tracking_ai_config
FOR SELECT TO authenticated
USING (public.can_view_candidate_record(auth.uid(), candidate_id));

-- Storage: action-evidence
DROP POLICY IF EXISTS "Authenticated read action-evidence" ON storage.objects;
CREATE POLICY "Authenticated read action-evidence" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'action-evidence'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
    OR public.is_auditor_hierarquia(auth.uid())
  )
);

-- Storage: candidate-photos (escrita restrita a admins)
DROP POLICY IF EXISTS "Authenticated users can upload candidate photos" ON storage.objects;
CREATE POLICY "Admins can upload candidate photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'candidate-photos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update candidate photos" ON storage.objects;
CREATE POLICY "Admins can update candidate photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'candidate-photos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'candidate-photos' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete candidate photos" ON storage.objects;
CREATE POLICY "Admins can delete candidate photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'candidate-photos' AND public.is_admin(auth.uid()));