
CREATE TABLE public.party_slate_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party TEXT NOT NULL CHECK (party IN ('PL','Novo')),
  cargo TEXT NOT NULL CHECK (cargo IN ('Deputado Federal','Deputado Estadual')),
  order_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  city TEXT,
  association TEXT,
  filiacao_status TEXT NOT NULL DEFAULT 'pendente' CHECK (filiacao_status IN ('ok','pl','pl_mulher','deputado_atual','pendente','outro')),
  filiacao_note TEXT,
  phone TEXT,
  instagram_url TEXT,
  photo_url TEXT,
  votes_bom NUMERIC,
  votes_medio NUMERIC,
  votes_ruim NUMERIC,
  general_status TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE UNIQUE INDEX party_slate_candidates_unique_order
  ON public.party_slate_candidates (party, cargo, order_index)
  WHERE deleted_at IS NULL;

CREATE INDEX party_slate_candidates_party_cargo_idx
  ON public.party_slate_candidates (party, cargo)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_slate_candidates TO authenticated;
GRANT ALL ON public.party_slate_candidates TO service_role;

ALTER TABLE public.party_slate_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slates: admins and party managers can view"
  ON public.party_slate_candidates FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (party = 'PL'   AND public.get_user_party(auth.uid()) = 'Novo' IS FALSE AND public.get_user_party(auth.uid()) = 'PL')
    OR (party = 'Novo' AND public.get_user_party(auth.uid()) = 'Novo')
  );

CREATE POLICY "Slates: admins and party managers can insert"
  ON public.party_slate_candidates FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (party = 'PL'   AND public.get_user_party(auth.uid()) = 'PL')
    OR (party = 'Novo' AND public.get_user_party(auth.uid()) = 'Novo')
  );

CREATE POLICY "Slates: admins and party managers can update"
  ON public.party_slate_candidates FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (party = 'PL'   AND public.get_user_party(auth.uid()) = 'PL')
    OR (party = 'Novo' AND public.get_user_party(auth.uid()) = 'Novo')
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR (party = 'PL'   AND public.get_user_party(auth.uid()) = 'PL')
    OR (party = 'Novo' AND public.get_user_party(auth.uid()) = 'Novo')
  );

CREATE POLICY "Slates: admins and party managers can delete"
  ON public.party_slate_candidates FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (party = 'PL'   AND public.get_user_party(auth.uid()) = 'PL')
    OR (party = 'Novo' AND public.get_user_party(auth.uid()) = 'Novo')
  );

CREATE TRIGGER party_slate_candidates_updated_at
  BEFORE UPDATE ON public.party_slate_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
