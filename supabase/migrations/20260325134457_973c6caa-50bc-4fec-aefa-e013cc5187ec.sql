
-- ═══════════════════════════════════════════════════════════════
-- Electoral Surveys — persistence tables
-- ═══════════════════════════════════════════════════════════════

-- 1. electoral_surveys (ondas/waves)
CREATE TABLE public.electoral_surveys (
  id               uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institute        text    NOT NULL,
  territory        text    NOT NULL DEFAULT 'Estado do Paraná',
  cargos           text[]  NOT NULL DEFAULT '{}',
  collection_start text    NULL,
  collection_end   text    NULL,
  release_date     text    NOT NULL,
  sample_size      integer NOT NULL DEFAULT 0,
  margin_of_error  numeric NOT NULL DEFAULT 0,
  methodology      text    NULL,
  tse_registration text    NULL,
  file_name        text    NULL,
  deleted_at       timestamptz NULL,
  created_by       uuid    NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.electoral_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pesquisas visíveis por autenticados"
  ON public.electoral_surveys FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Autenticados criam pesquisas"
  ON public.electoral_surveys FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados atualizam pesquisas"
  ON public.electoral_surveys FOR UPDATE
  TO authenticated
  USING (true);

-- 2. survey_questions (perguntas por onda)
CREATE TABLE public.survey_questions (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id      uuid NOT NULL REFERENCES public.electoral_surveys(id) ON DELETE CASCADE,
  cargo          text NOT NULL,
  question_type  text NOT NULL,
  scenario_label text NOT NULL DEFAULT 'Cenário 1',
  note           text NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questões visíveis por autenticados"
  ON public.survey_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados criam questões"
  ON public.survey_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados deletam questões"
  ON public.survey_questions FOR DELETE
  TO authenticated
  USING (true);

-- 3. survey_results (candidato + percentual por pergunta)
CREATE TABLE public.survey_results (
  id             uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id    uuid    NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  candidate_name text    NOT NULL,
  percentage     numeric NOT NULL DEFAULT 0,
  is_excluded    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resultados visíveis por autenticados"
  ON public.survey_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados criam resultados"
  ON public.survey_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autenticados deletam resultados"
  ON public.survey_results FOR DELETE
  TO authenticated
  USING (true);

-- Trigger updated_at
CREATE TRIGGER update_electoral_surveys_updated_at
  BEFORE UPDATE ON public.electoral_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
