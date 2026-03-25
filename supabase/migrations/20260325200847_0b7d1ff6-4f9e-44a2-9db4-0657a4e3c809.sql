
CREATE TYPE public.strategic_alert_type AS ENUM (
  'risco_operacional',
  'risco_eleitoral',
  'ineficiencia_atuacao',
  'oportunidade_estrategica'
);

CREATE TYPE public.strategic_alert_status AS ENUM (
  'ativo',
  'em_analise',
  'resolvido',
  'descartado'
);

CREATE TABLE public.strategic_alerts (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type             public.strategic_alert_type NOT NULL DEFAULT 'risco_operacional',
  title            TEXT NOT NULL,
  description      TEXT,
  recommendation   TEXT,
  severity         INTEGER NOT NULL DEFAULT 5,
  score            NUMERIC(5,2) DEFAULT 0,
  status           public.strategic_alert_status NOT NULL DEFAULT 'ativo',
  territory        TEXT,
  municipality     TEXT,
  macroregion_id   TEXT,
  microregion      TEXT,
  risk_index       NUMERIC(5,2),
  opportunity_index NUMERIC(5,2),
  source_data      JSONB,
  is_read          BOOLEAN NOT NULL DEFAULT false,
  resolved_at      TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_strategic_alerts_status ON public.strategic_alerts(status);
CREATE INDEX idx_strategic_alerts_type ON public.strategic_alerts(type);
CREATE INDEX idx_strategic_alerts_severity ON public.strategic_alerts(severity DESC);
CREATE INDEX idx_strategic_alerts_macroregion ON public.strategic_alerts(macroregion_id);
CREATE INDEX idx_strategic_alerts_created ON public.strategic_alerts(created_at DESC);

ALTER TABLE public.strategic_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strategic alerts visible to authenticated" ON public.strategic_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert strategic alerts" ON public.strategic_alerts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update strategic alerts" ON public.strategic_alerts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admin can delete strategic alerts" ON public.strategic_alerts
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_strategic_alerts_updated_at
  BEFORE UPDATE ON public.strategic_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
