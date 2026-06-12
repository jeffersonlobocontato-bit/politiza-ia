
ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS impact_score integer,
  ADD COLUMN IF NOT EXISTS municipality_population_snapshot integer;

ALTER TABLE public.actions
  ADD CONSTRAINT actions_impact_score_range CHECK (impact_score IS NULL OR (impact_score >= 0 AND impact_score <= 100));

ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS population integer;

CREATE INDEX IF NOT EXISTS idx_actions_impact_score ON public.actions(impact_score) WHERE deleted_at IS NULL;
