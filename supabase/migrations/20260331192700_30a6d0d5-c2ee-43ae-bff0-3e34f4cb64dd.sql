
-- Enums for tracking module
CREATE TYPE public.tracking_round_status AS ENUM ('aberta', 'fechada', 'em_analise');
CREATE TYPE public.tracking_insight_type AS ENUM ('performance', 'eficiencia', 'capilaridade', 'oportunidade');
CREATE TYPE public.tracking_insight_status AS ENUM ('novo', 'visualizado', 'em_analise', 'resolvido');
CREATE TYPE public.tracking_alert_type AS ENUM ('baixa_capilaridade', 'queda_tracking', 'oportunidade_expansao', 'baixa_eficiencia', 'indecisos_altos');

-- ============================================
-- tracking_rounds
-- ============================================
CREATE TABLE public.tracking_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  territory_scope TEXT NOT NULL DEFAULT 'estado',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status tracking_round_status NOT NULL DEFAULT 'aberta',
  target_interviews INTEGER NOT NULL DEFAULT 100,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.tracking_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rodadas visíveis por autenticados" ON public.tracking_rounds
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "Admin cria rodadas" ON public.tracking_rounds
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin atualiza rodadas" ON public.tracking_rounds
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_tracking_rounds_updated_at
  BEFORE UPDATE ON public.tracking_rounds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- tracking_interviews
-- ============================================
CREATE TABLE public.tracking_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.tracking_rounds(id) ON DELETE CASCADE NOT NULL,
  interviewer_id UUID NOT NULL,
  municipality TEXT,
  microregion TEXT,
  macroregion_id TEXT,
  lat NUMERIC,
  lng NUMERIC,
  respondent_age_range TEXT,
  respondent_gender TEXT,
  respondent_income TEXT,
  respondent_education TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entrevistador insere entrevistas" ON public.tracking_interviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = interviewer_id);

CREATE POLICY "Entrevistador vê próprias entrevistas" ON public.tracking_interviews
  FOR SELECT TO authenticated USING (
    auth.uid() = interviewer_id OR is_admin(auth.uid())
  );

-- ============================================
-- tracking_interview_answers
-- ============================================
CREATE TABLE public.tracking_interview_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID REFERENCES public.tracking_interviews(id) ON DELETE CASCADE NOT NULL,
  question_key TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  candidate_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_interview_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados inserem respostas" ON public.tracking_interview_answers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin vê respostas" ON public.tracking_interview_answers
  FOR SELECT TO authenticated USING (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.tracking_interviews ti
      WHERE ti.id = interview_id AND ti.interviewer_id = auth.uid()
    )
  );

-- ============================================
-- tracking_ai_insights
-- ============================================
CREATE TABLE public.tracking_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.tracking_rounds(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  insight_type tracking_insight_type NOT NULL DEFAULT 'performance',
  territory_scope TEXT,
  municipality TEXT,
  microregion TEXT,
  macroregion_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  severity INTEGER NOT NULL DEFAULT 5,
  priority_score NUMERIC DEFAULT 0,
  capillarity_score NUMERIC DEFAULT 0,
  efficiency_score NUMERIC DEFAULT 0,
  source_data JSONB,
  status tracking_insight_status NOT NULL DEFAULT 'novo',
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê insights" ON public.tracking_ai_insights
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admin atualiza insights" ON public.tracking_ai_insights
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Sistema insere insights" ON public.tracking_ai_insights
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_tracking_ai_insights_updated_at
  BEFORE UPDATE ON public.tracking_ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- tracking_ai_alerts
-- ============================================
CREATE TABLE public.tracking_ai_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES public.tracking_rounds(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  alert_type tracking_alert_type NOT NULL DEFAULT 'baixa_capilaridade',
  municipality TEXT,
  microregion TEXT,
  macroregion_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  severity INTEGER NOT NULL DEFAULT 5,
  priority_score NUMERIC DEFAULT 0,
  status tracking_insight_status NOT NULL DEFAULT 'novo',
  resolution_note TEXT,
  field_actions_count INTEGER DEFAULT 0,
  tracking_variation NUMERIC DEFAULT 0,
  capillarity_index NUMERIC DEFAULT 0,
  generated_from JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_ai_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê alertas tracking" ON public.tracking_ai_alerts
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admin atualiza alertas tracking" ON public.tracking_ai_alerts
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Sistema insere alertas tracking" ON public.tracking_ai_alerts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_tracking_ai_alerts_updated_at
  BEFORE UPDATE ON public.tracking_ai_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_ai_alerts;
