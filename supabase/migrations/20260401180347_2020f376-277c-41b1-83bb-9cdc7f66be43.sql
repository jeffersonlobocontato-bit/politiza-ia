
-- Interviewers table to track registered field interviewers
CREATE TABLE public.tracking_interviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(candidate_id, email)
);

ALTER TABLE public.tracking_interviewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia entrevistadores" ON public.tracking_interviewers
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Entrevistador vê próprio registro" ON public.tracking_interviewers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
