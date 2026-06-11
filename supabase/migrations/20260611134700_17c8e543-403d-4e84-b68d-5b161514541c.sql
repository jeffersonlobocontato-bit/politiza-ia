
CREATE TABLE IF NOT EXISTS public.fiscalize_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  category text NOT NULL,
  title text NOT NULL,
  denounced_name text NOT NULL,
  denounced_role text,
  denounced_party text,
  narrative text NOT NULL,
  lat double precision,
  lng double precision,
  address text,
  municipality text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  ai_risk_score numeric,
  status text NOT NULL DEFAULT 'nova',
  severity text NOT NULL DEFAULT 'media',
  legal_notes text,
  protocol_number text,
  assigned_to uuid,
  created_by uuid,
  client_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS fiscalize_reports_candidate_idx ON public.fiscalize_reports(candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS fiscalize_reports_created_by_idx ON public.fiscalize_reports(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS fiscalize_reports_status_idx ON public.fiscalize_reports(status) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscalize_reports TO authenticated;
GRANT ALL ON public.fiscalize_reports TO service_role;

ALTER TABLE public.fiscalize_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscalize_select" ON public.fiscalize_reports FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'juridico'::public.app_role)
    OR created_by = auth.uid()
    OR public.can_view_by_creator_party(auth.uid(), created_by)
  )
);

CREATE POLICY "fiscalize_insert" ON public.fiscalize_reports FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "fiscalize_update" ON public.fiscalize_reports FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'juridico'::public.app_role)
  OR created_by = auth.uid()
);

CREATE POLICY "fiscalize_delete" ON public.fiscalize_reports FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER fiscalize_reports_updated_at
BEFORE UPDATE ON public.fiscalize_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fiscalize_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.fiscalize_reports(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fiscalize_history_report_idx ON public.fiscalize_history(report_id);

GRANT SELECT, INSERT ON public.fiscalize_history TO authenticated;
GRANT ALL ON public.fiscalize_history TO service_role;

ALTER TABLE public.fiscalize_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscalize_history_select" ON public.fiscalize_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.fiscalize_reports r
    WHERE r.id = report_id AND r.deleted_at IS NULL AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'juridico'::public.app_role)
      OR r.created_by = auth.uid()
      OR public.can_view_by_creator_party(auth.uid(), r.created_by)
    )
  )
);

CREATE POLICY "fiscalize_history_insert" ON public.fiscalize_history FOR INSERT TO authenticated
WITH CHECK (
  changed_by = auth.uid() AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'juridico'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.fiscalize_reports r WHERE r.id = report_id AND r.created_by = auth.uid())
  )
);

CREATE POLICY "fiscalize_evidence_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fiscalize-evidence'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "fiscalize_evidence_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'fiscalize-evidence' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'juridico'::public.app_role)
  )
);

CREATE POLICY "fiscalize_evidence_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fiscalize-evidence' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())
  )
);
