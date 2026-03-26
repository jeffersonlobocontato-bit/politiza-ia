
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS resolution_note text;

ALTER TABLE public.strategic_alerts
  ADD COLUMN IF NOT EXISTS resolution_note text;
