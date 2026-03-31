
-- Add territorial columns to tracking_rounds
ALTER TABLE public.tracking_rounds
  ADD COLUMN IF NOT EXISTS macroregion_id text,
  ADD COLUMN IF NOT EXISTS microregion text,
  ADD COLUMN IF NOT EXISTS municipality text;

-- Create tracking_round_questions table
CREATE TABLE public.tracking_round_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  label text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_round_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perguntas visíveis por autenticados"
  ON public.tracking_round_questions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin cria perguntas"
  ON public.tracking_round_questions FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin atualiza perguntas"
  ON public.tracking_round_questions FOR UPDATE
  TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admin deleta perguntas"
  ON public.tracking_round_questions FOR DELETE
  TO authenticated USING (is_admin(auth.uid()));
