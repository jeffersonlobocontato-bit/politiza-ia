
-- ============================================================
-- PROPORTIONAL CAMPAIGNS MODULE
-- ============================================================

-- Leaders table (proportional campaign leaders)
CREATE TABLE public.leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  photo_url text,
  status text NOT NULL DEFAULT 'ativo',
  observations text,
  -- Territory
  neighborhood text,
  municipality text,
  microregion text,
  macroregion_id text,
  secondary_territories jsonb DEFAULT '[]'::jsonb,
  coverage_type text NOT NULL DEFAULT 'cidade',
  -- Campaign relationship
  candidate_id uuid REFERENCES public.candidates(id),
  coordinator_id uuid REFERENCES public.campaign_members(id),
  entry_date date DEFAULT CURRENT_DATE,
  support_status text DEFAULT 'indefinido',
  alignment_status text DEFAULT 'neutro',
  relationship_owner text,
  -- Political strength
  influence_level integer NOT NULL DEFAULT 5,
  mobilization_capacity integer NOT NULL DEFAULT 5,
  estimated_supporters integer NOT NULL DEFAULT 0,
  local_reputation integer NOT NULL DEFAULT 5,
  political_reliability integer NOT NULL DEFAULT 5,
  -- Party
  current_party text,
  -- Audit
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Leader political/electoral history
CREATE TABLE public.leader_political_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  was_neighborhood_president boolean DEFAULT false,
  was_councilperson boolean DEFAULT false,
  was_candidate boolean DEFAULT false,
  positions_disputed text[] DEFAULT '{}',
  times_candidate integer DEFAULT 0,
  held_mandate boolean DEFAULT false,
  mandate_count integer DEFAULT 0,
  positions_held text[] DEFAULT '{}',
  election_years text[] DEFAULT '{}',
  electoral_performance text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Leader party history
CREATE TABLE public.leader_party_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  party_name text NOT NULL,
  start_year integer,
  end_year integer,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Leader <-> leadership_profiles junction (reuses existing dynamic profiles)
CREATE TABLE public.leader_leadership_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid NOT NULL REFERENCES public.leaders(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.leadership_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(leader_id, profile_id)
);

-- Vote projections
CREATE TABLE public.vote_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id),
  leader_id uuid NOT NULL REFERENCES public.leaders(id),
  candidacy_type text NOT NULL DEFAULT 'vereador',
  neighborhood text,
  municipality text,
  microregion text,
  macroregion_id text,
  optimistic integer NOT NULL,
  intermediate integer NOT NULL,
  pessimistic integer NOT NULL,
  justification text,
  observations text,
  projection_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'ativa',
  reliability_index text DEFAULT 'media',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Vote projection revisions
CREATE TABLE public.vote_projection_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_id uuid NOT NULL REFERENCES public.vote_projections(id) ON DELETE CASCADE,
  prev_optimistic integer NOT NULL,
  prev_intermediate integer NOT NULL,
  prev_pessimistic integer NOT NULL,
  new_optimistic integer NOT NULL,
  new_intermediate integer NOT NULL,
  new_pessimistic integer NOT NULL,
  revision_reason text,
  revised_by uuid,
  revised_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at triggers
CREATE TRIGGER update_leaders_updated_at BEFORE UPDATE ON public.leaders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leader_political_history_updated_at BEFORE UPDATE ON public.leader_political_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vote_projections_updated_at BEFORE UPDATE ON public.vote_projections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_political_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_party_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leader_leadership_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_projection_revisions ENABLE ROW LEVEL SECURITY;

-- RLS: leaders
CREATE POLICY "Leaders visible to authenticated" ON public.leaders FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Authenticated create leaders" ON public.leaders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update leaders" ON public.leaders FOR UPDATE TO authenticated USING (true);

-- RLS: leader_political_history
CREATE POLICY "Political history visible" ON public.leader_political_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create political history" ON public.leader_political_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update political history" ON public.leader_political_history FOR UPDATE TO authenticated USING (true);

-- RLS: leader_party_history
CREATE POLICY "Party history visible" ON public.leader_party_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create party history" ON public.leader_party_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update party history" ON public.leader_party_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete party history" ON public.leader_party_history FOR DELETE TO authenticated USING (true);

-- RLS: leader_leadership_profiles
CREATE POLICY "Leader profiles visible" ON public.leader_leadership_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create leader profiles" ON public.leader_leadership_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated delete leader profiles" ON public.leader_leadership_profiles FOR DELETE TO authenticated USING (true);

-- RLS: vote_projections
CREATE POLICY "Projections visible to authenticated" ON public.vote_projections FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Authenticated create projections" ON public.vote_projections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update projections" ON public.vote_projections FOR UPDATE TO authenticated USING (true);

-- RLS: vote_projection_revisions
CREATE POLICY "Revisions visible" ON public.vote_projection_revisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create revisions" ON public.vote_projection_revisions FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for projections
ALTER PUBLICATION supabase_realtime ADD TABLE public.vote_projections;
