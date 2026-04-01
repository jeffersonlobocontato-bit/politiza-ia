
-- Agent config table (one per candidate)
CREATE TABLE public.tracking_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  system_instructions text NOT NULL DEFAULT 'Você é um analista político estratégico especializado em campanhas eleitorais brasileiras. Analise os dados de tracking e ações de campo para gerar insights acionáveis.',
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_id)
);

ALTER TABLE public.tracking_ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia config IA" ON public.tracking_ai_config FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Config visível por autenticados" ON public.tracking_ai_config FOR SELECT TO authenticated USING (true);

-- Knowledge files table
CREATE TABLE public.tracking_ai_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  content_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.tracking_ai_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia knowledge" ON public.tracking_ai_knowledge FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Knowledge visível por autenticados" ON public.tracking_ai_knowledge FOR SELECT TO authenticated USING (true);

-- Chat messages table
CREATE TABLE public.tracking_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.tracking_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia mensagens" ON public.tracking_ai_messages FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Mensagens visíveis por autenticados" ON public.tracking_ai_messages FOR SELECT TO authenticated USING (true);

-- Storage bucket for knowledge files
INSERT INTO storage.buckets (id, name, public) VALUES ('tracking-knowledge', 'tracking-knowledge', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin upload knowledge" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tracking-knowledge' AND is_admin(auth.uid()));
CREATE POLICY "Admin delete knowledge" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tracking-knowledge' AND is_admin(auth.uid()));
CREATE POLICY "Authenticated read knowledge" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tracking-knowledge');
