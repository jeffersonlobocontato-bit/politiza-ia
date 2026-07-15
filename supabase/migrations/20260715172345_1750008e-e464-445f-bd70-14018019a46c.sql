
-- Garante a coluna deleted_at (soft delete) usada pelos filtros
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due ON public.tasks(assigned_to, due_date) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.tasks_notify_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), NULL);
  v_secret text;
  v_url text;
  v_body jsonb;
  v_link text;
  v_message text;
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;
  IF NEW.assigned_to = v_actor THEN RETURN NEW; END IF;

  v_link := '/campo/tarefas?task=' || NEW.id::text;
  v_message := 'Nova tarefa atribuída a você: ' || NEW.title;

  INSERT INTO public.notifications(user_id, type, report_id, actor_id, message, link)
  VALUES (NEW.assigned_to, 'task_assigned', NEW.id, v_actor, v_message, v_link);

  -- Dispara push (best-effort) via pg_net + edge function send-push
  SELECT secret INTO v_secret FROM public.internal_cron_secrets WHERE name = 'task-overdue-reminders';
  IF v_secret IS NOT NULL THEN
    v_url := 'https://sumdjlmjtqgfzkcfkceq.supabase.co/functions/v1/send-push';
    v_body := jsonb_build_object(
      'user_ids', jsonb_build_array(NEW.assigned_to::text),
      'payload', jsonb_build_object(
        'title', 'Nova tarefa',
        'body', NEW.title,
        'url', v_link,
        'tag', 'task-' || NEW.id::text
      )
    );
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body := v_body
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_notify_assignment ON public.tasks;
CREATE TRIGGER trg_tasks_notify_assignment
AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tasks_notify_assignment();
