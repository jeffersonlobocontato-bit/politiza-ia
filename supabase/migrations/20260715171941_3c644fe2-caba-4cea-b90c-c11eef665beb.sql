
CREATE TABLE IF NOT EXISTS public.internal_cron_secrets (
  name TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sem GRANT para anon/authenticated — apenas service_role acessa.
GRANT ALL ON public.internal_cron_secrets TO service_role;
ALTER TABLE public.internal_cron_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON public.internal_cron_secrets
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

INSERT INTO public.internal_cron_secrets(name, secret)
VALUES ('task-overdue-reminders', gen_random_uuid()::text || gen_random_uuid()::text)
ON CONFLICT (name) DO NOTHING;
