ALTER TABLE public.leader_political_history
  ADD COLUMN IF NOT EXISTS has_current_mandate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_mandate_position text,
  ADD COLUMN IF NOT EXISTS current_mandate_community text,
  ADD COLUMN IF NOT EXISTS current_mandate_entity text;