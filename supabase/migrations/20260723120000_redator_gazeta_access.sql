-- Redator Gazeta: agente de IA redator com competências editoriais estilo
-- Gazeta do Povo, capaz de cruzar as fontes de dados da plataforma
-- (emendas parlamentares, ativos políticos, ações de campo, pesquisas
-- eleitorais) para gerar conteúdo persuasivo.
--
-- Acesso 100% exclusivo por concessão individual (sem bypass por role,
-- nem mesmo admin_master) — só quem tem linha em redator_gazeta_access
-- entra. Diferente do padrão do Cruzamento Moro, aqui não existe atalho
-- por papel: a aba é pensada para ficar restrita a uma única pessoa.

CREATE TABLE IF NOT EXISTS public.redator_gazeta_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT ON public.redator_gazeta_access TO authenticated;
GRANT ALL ON public.redator_gazeta_access TO service_role;

ALTER TABLE public.redator_gazeta_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master manages redator_gazeta_access"
  ON public.redator_gazeta_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "user sees own redator_gazeta_access"
  ON public.redator_gazeta_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Histórico de gerações, para revisar/reaproveitar textos já produzidos.
CREATE TABLE IF NOT EXISTS public.redator_gazeta_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.redator_gazeta_messages TO authenticated;
GRANT ALL ON public.redator_gazeta_messages TO service_role;

ALTER TABLE public.redator_gazeta_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user manages own redator_gazeta_messages"
  ON public.redator_gazeta_messages
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Seed: acesso exclusivo para Jefferson Lobo (perfil já existente,
-- ver 20250325000002_admin_seed.sql).
INSERT INTO public.redator_gazeta_access (user_id, email, granted_by)
VALUES (
  '1f80b89a-4a40-4e2a-941e-d79f7914fdfb',
  'jeffersonlobocontato@gmail.com',
  '1f80b89a-4a40-4e2a-941e-d79f7914fdfb'
)
ON CONFLICT (user_id) DO NOTHING;
