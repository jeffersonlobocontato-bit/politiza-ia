
-- Leadership profiles table
CREATE TABLE public.leadership_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  level text NOT NULL DEFAULT 'local' CHECK (level IN ('local', 'regional', 'estadual')),
  color text NOT NULL DEFAULT '#6b7280',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Junction table for political_assets <-> leadership_profiles (many-to-many)
CREATE TABLE public.asset_leadership_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.political_assets(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.leadership_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.leadership_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_leadership_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for leadership_profiles
CREATE POLICY "Profiles visíveis por autenticados" ON public.leadership_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin cria perfis" ON public.leadership_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin atualiza perfis" ON public.leadership_profiles FOR UPDATE TO authenticated USING (true);

-- RLS policies for junction table
CREATE POLICY "Vínculo visível por autenticados" ON public.asset_leadership_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam vínculo" ON public.asset_leadership_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados deletam vínculo" ON public.asset_leadership_profiles FOR DELETE TO authenticated USING (true);

-- Updated_at trigger for leadership_profiles
CREATE TRIGGER update_leadership_profiles_updated_at BEFORE UPDATE ON public.leadership_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default profiles
INSERT INTO public.leadership_profiles (name, description, category, level, color) VALUES
  ('Liderança Comunitária', 'Líder de comunidade ou bairro', 'Social', 'local', '#22c55e'),
  ('Liderança Empresarial', 'Empresário com influência política', 'Econômico', 'regional', '#3b82f6'),
  ('Liderança Religiosa', 'Líder religioso com base eleitoral', 'Social', 'local', '#a855f7'),
  ('Liderança Sindical', 'Líder de sindicato ou associação', 'Trabalhista', 'regional', '#f59e0b'),
  ('Influenciador Digital', 'Influenciador com alcance regional', 'Comunicação', 'estadual', '#06b6d4'),
  ('Articulador Político', 'Articulador de alianças partidárias', 'Político', 'estadual', '#ef4444'),
  ('Líder Rural', 'Liderança do agronegócio ou agricultura familiar', 'Econômico', 'regional', '#84cc16'),
  ('Líder Estudantil', 'Liderança de movimentos estudantis', 'Social', 'local', '#ec4899');
