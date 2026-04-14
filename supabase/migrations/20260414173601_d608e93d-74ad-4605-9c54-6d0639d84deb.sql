
-- Tabela principal de associações
CREATE TABLE public.municipality_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acronym text NOT NULL,
  name text NOT NULL,
  polo_city text,
  president_name text,
  president_city text,
  phone text,
  address text,
  email text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de vínculo associação <-> município
CREATE TABLE public.association_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES public.municipality_associations(id) ON DELETE CASCADE,
  municipality_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(association_id, municipality_name)
);

-- RLS
ALTER TABLE public.municipality_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;

-- Leitura para autenticados
CREATE POLICY "Associações visíveis por autenticados" ON public.municipality_associations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia associações" ON public.municipality_associations FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Membros visíveis por autenticados" ON public.association_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia membros" ON public.association_members FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_municipality_associations_updated_at
  BEFORE UPDATE ON public.municipality_associations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
