ALTER TABLE public.leaders
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

ALTER TABLE public.campaign_members
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

CREATE INDEX IF NOT EXISTS idx_leaders_geo ON public.leaders (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_members_geo ON public.campaign_members (lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;