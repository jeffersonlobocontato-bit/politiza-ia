
-- 1) push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions(user_id);

-- 2) Índice para o cron diário
CREATE INDEX IF NOT EXISTS tasks_assigned_due_idx
  ON public.tasks(assigned_to, status, due_date)
  WHERE deleted_at IS NULL;

-- 3) Trigger: cria notificação in-app quando tarefa é atribuída a alguém
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID := NEW.assigned_to;
  actor UUID := NEW.created_by;
BEGIN
  IF target_user IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  IF target_user = actor THEN RETURN NEW; END IF;

  INSERT INTO public.notifications(user_id, type, actor_id, message, link)
  VALUES (
    target_user,
    'task_assignment',
    actor,
    'Nova tarefa atribuída a você: ' || COALESCE(NEW.title, ''),
    '/campo/tarefas?task=' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assignment_ins ON public.tasks;
CREATE TRIGGER trg_notify_task_assignment_ins
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

DROP TRIGGER IF EXISTS trg_notify_task_assignment_upd ON public.tasks;
CREATE TRIGGER trg_notify_task_assignment_upd
  AFTER UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- 4) pg_cron + pg_net para lembrete diário 07h BRT (10h UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
