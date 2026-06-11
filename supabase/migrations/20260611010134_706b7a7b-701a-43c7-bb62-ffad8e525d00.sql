ALTER TABLE public.party_slate_candidates
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS party_slate_candidates_candidate_id_idx
  ON public.party_slate_candidates(candidate_id) WHERE deleted_at IS NULL;