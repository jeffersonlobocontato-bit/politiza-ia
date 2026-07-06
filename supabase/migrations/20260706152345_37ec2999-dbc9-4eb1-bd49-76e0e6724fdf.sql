
CREATE TABLE public.raio_x_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_origin text NOT NULL,
  asset_source_id uuid,
  asset_key text NOT NULL,
  subject_name text NOT NULL,
  subject_municipality text,
  subject_party text,
  subject_position text,
  context_input text,
  report_html text NOT NULL,
  report_markdown text,
  model text,
  reviewer_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX raio_x_reports_asset_idx ON public.raio_x_reports (asset_origin, asset_source_id);
CREATE INDEX raio_x_reports_asset_key_idx ON public.raio_x_reports (asset_key);
CREATE INDEX raio_x_reports_created_at_idx ON public.raio_x_reports (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.raio_x_reports TO authenticated;
GRANT ALL ON public.raio_x_reports TO service_role;

ALTER TABLE public.raio_x_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raio_x_reports_select_admins"
  ON public.raio_x_reports FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master')
    OR public.has_role(auth.uid(), 'coordenador_geral')
    OR public.has_role(auth.uid(), 'coordenador_estadual')
  );

CREATE POLICY "raio_x_reports_insert_admins"
  ON public.raio_x_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin_master')
      OR public.has_role(auth.uid(), 'coordenador_geral')
      OR public.has_role(auth.uid(), 'coordenador_estadual')
    )
  );

CREATE POLICY "raio_x_reports_update_admins"
  ON public.raio_x_reports FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master')
    OR public.has_role(auth.uid(), 'coordenador_geral')
    OR public.has_role(auth.uid(), 'coordenador_estadual')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_master')
    OR public.has_role(auth.uid(), 'coordenador_geral')
    OR public.has_role(auth.uid(), 'coordenador_estadual')
  );

CREATE POLICY "raio_x_reports_delete_admins"
  ON public.raio_x_reports FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_master')
    OR public.has_role(auth.uid(), 'coordenador_geral')
    OR public.has_role(auth.uid(), 'coordenador_estadual')
  );

CREATE TRIGGER update_raio_x_reports_updated_at
  BEFORE UPDATE ON public.raio_x_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
