CREATE TABLE IF NOT EXISTS public.campaign_member_municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.campaign_members(id) ON DELETE CASCADE,
  municipality text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, municipality)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_member_municipalities TO authenticated;
GRANT ALL ON public.campaign_member_municipalities TO service_role;

ALTER TABLE public.campaign_member_municipalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read member municipalities" ON public.campaign_member_municipalities;
CREATE POLICY "Authenticated read member municipalities"
  ON public.campaign_member_municipalities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage member municipalities" ON public.campaign_member_municipalities;
CREATE POLICY "Admins manage member municipalities"
  ON public.campaign_member_municipalities FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_cmm_member ON public.campaign_member_municipalities(member_id);
CREATE INDEX IF NOT EXISTS idx_cmm_municipality ON public.campaign_member_municipalities(lower(municipality));