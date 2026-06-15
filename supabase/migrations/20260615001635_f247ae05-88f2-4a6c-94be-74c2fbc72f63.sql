
-- Enums
CREATE TYPE public.task_status AS ENUM ('a_fazer','em_andamento','bloqueado','concluido');
CREATE TYPE public.task_area AS ENUM ('central','regional','partidario');
CREATE TYPE public.task_priority AS ENUM ('urgente','alta','normal','baixa');

-- tasks
CREATE TABLE public.tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  status         public.task_status NOT NULL DEFAULT 'a_fazer',
  priority       public.task_priority NOT NULL DEFAULT 'normal',
  area           public.task_area NOT NULL DEFAULT 'central',
  assigned_to    UUID,
  assigned_name  TEXT,
  due_date       DATE,
  candidate_id   UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR public.can_view_candidate_record(auth.uid(), candidate_id)
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = created_by
    AND (
      public.is_admin(auth.uid())
      OR public.can_view_candidate_record(auth.uid(), candidate_id)
    )
  );

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated USING (
    public.is_admin(auth.uid())
    OR auth.uid() = created_by
    OR auth.uid() = assigned_to
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated USING (
    public.is_admin(auth.uid()) OR auth.uid() = created_by
  );

CREATE INDEX idx_tasks_candidate_id ON public.tasks(candidate_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned_to  ON public.tasks(assigned_to)  WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status       ON public.tasks(status)       WHERE deleted_at IS NULL;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- daily_checkins
CREATE TABLE public.daily_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  user_name       TEXT,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  delivered       TEXT NOT NULL,
  planned         TEXT NOT NULL,
  blocked         TEXT,
  candidate_id    UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE (user_id, checkin_date, candidate_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_select" ON public.daily_checkins
  FOR SELECT TO authenticated USING (
    public.is_admin(auth.uid())
    OR auth.uid() = user_id
    OR public.can_view_candidate_record(auth.uid(), candidate_id)
  );

CREATE POLICY "checkins_insert" ON public.daily_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checkins_update" ON public.daily_checkins
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

CREATE INDEX idx_checkins_date      ON public.daily_checkins(checkin_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_checkins_user      ON public.daily_checkins(user_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_checkins_candidate ON public.daily_checkins(candidate_id) WHERE deleted_at IS NULL;

CREATE TRIGGER checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
