
-- 1. Add columns to fiscalize_reports
ALTER TABLE public.fiscalize_reports
  ADD COLUMN IF NOT EXISTS assigned_lawyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS fiscalize_reports_lawyer_idx
  ON public.fiscalize_reports(assigned_lawyer_id) WHERE deleted_at IS NULL;

-- 2. Notes
CREATE TABLE IF NOT EXISTS public.fiscalize_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.fiscalize_reports(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  mentions uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscalize_notes TO authenticated;
GRANT ALL ON public.fiscalize_notes TO service_role;
ALTER TABLE public.fiscalize_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.fiscalize_notes FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.fiscalize_reports r
    WHERE r.id = report_id AND r.deleted_at IS NULL AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'juridico'::app_role)
      OR r.created_by = auth.uid()
      OR public.can_view_by_creator_party(auth.uid(), r.created_by)
    )
  )
);
CREATE POLICY "notes_insert" ON public.fiscalize_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid() AND (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'juridico'::app_role)
  )
);
CREATE INDEX fiscalize_notes_report_idx ON public.fiscalize_notes(report_id);

-- 3. Attachments
CREATE TABLE IF NOT EXISTS public.fiscalize_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.fiscalize_reports(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  path text NOT NULL,
  name text NOT NULL,
  mime text,
  size bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscalize_attachments TO authenticated;
GRANT ALL ON public.fiscalize_attachments TO service_role;
ALTER TABLE public.fiscalize_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_select" ON public.fiscalize_attachments FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.fiscalize_reports r
    WHERE r.id = report_id AND r.deleted_at IS NULL AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'juridico'::app_role)
      OR r.created_by = auth.uid()
      OR public.can_view_by_creator_party(auth.uid(), r.created_by)
    )
  )
);
CREATE POLICY "att_insert" ON public.fiscalize_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'juridico'::app_role)
  )
);
CREATE POLICY "att_update" ON public.fiscalize_attachments FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR uploaded_by = auth.uid());
CREATE INDEX fiscalize_att_report_idx ON public.fiscalize_attachments(report_id);

-- 4. Notifications (generic)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  report_id uuid REFERENCES public.fiscalize_reports(id) ON DELETE CASCADE,
  actor_id uuid,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "notif_insert_authn" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);  -- triggers run as definer; manual inserts allowed for assignment flow

CREATE INDEX notifications_user_unread_idx
  ON public.notifications(user_id, is_read, created_at DESC);

-- 5. Triggers — touch last_activity_at and create notifications

CREATE OR REPLACE FUNCTION public.fiscalize_touch_activity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.fiscalize_reports SET last_activity_at = now()
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notes_activity ON public.fiscalize_notes;
CREATE TRIGGER trg_notes_activity AFTER INSERT ON public.fiscalize_notes
FOR EACH ROW EXECUTE FUNCTION public.fiscalize_touch_activity();

DROP TRIGGER IF EXISTS trg_att_activity ON public.fiscalize_attachments;
CREATE TRIGGER trg_att_activity AFTER INSERT ON public.fiscalize_attachments
FOR EACH ROW EXECUTE FUNCTION public.fiscalize_touch_activity();

-- Mention notifications
CREATE OR REPLACE FUNCTION public.fiscalize_notify_mentions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid;
  rtitle text;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT title INTO rtitle FROM public.fiscalize_reports WHERE id = NEW.report_id;
  FOREACH uid IN ARRAY NEW.mentions LOOP
    IF uid <> NEW.author_id THEN
      INSERT INTO public.notifications(user_id, type, report_id, actor_id, message, link)
      VALUES (uid, 'mention', NEW.report_id, NEW.author_id,
              'Você foi mencionado em uma denúncia: ' || COALESCE(rtitle,''),
              '/juridico?report=' || NEW.report_id::text);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notes_mentions ON public.fiscalize_notes;
CREATE TRIGGER trg_notes_mentions AFTER INSERT ON public.fiscalize_notes
FOR EACH ROW EXECUTE FUNCTION public.fiscalize_notify_mentions();

-- Assignment notification
CREATE OR REPLACE FUNCTION public.fiscalize_notify_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_lawyer_id IS NOT NULL
     AND (OLD.assigned_lawyer_id IS DISTINCT FROM NEW.assigned_lawyer_id)
     AND NEW.assigned_lawyer_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications(user_id, type, report_id, actor_id, message, link)
    VALUES (NEW.assigned_lawyer_id, 'assignment', NEW.id, auth.uid(),
            'Você foi designado(a) como responsável jurídico pela denúncia: ' || NEW.title,
            '/juridico?report=' || NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fisc_assign ON public.fiscalize_reports;
CREATE TRIGGER trg_fisc_assign AFTER UPDATE OF assigned_lawyer_id ON public.fiscalize_reports
FOR EACH ROW EXECUTE FUNCTION public.fiscalize_notify_assignment();

-- 6. Storage policies for fiscalize-legal-docs (privado)
CREATE POLICY "legal_docs_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'fiscalize-legal-docs' AND (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'juridico'::app_role)
  )
);
CREATE POLICY "legal_docs_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'fiscalize-legal-docs' AND (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'juridico'::app_role)
  )
);
CREATE POLICY "legal_docs_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'fiscalize-legal-docs' AND public.is_admin(auth.uid())
);

-- 7. Helper view: lawyers (profiles with role juridico OR admin)
CREATE OR REPLACE VIEW public.juridico_users AS
SELECT p.id, p.full_name, p.email
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id
    AND ur.role IN ('juridico','admin_master','coordenador_geral','coordenador_estadual')
);
GRANT SELECT ON public.juridico_users TO authenticated;
