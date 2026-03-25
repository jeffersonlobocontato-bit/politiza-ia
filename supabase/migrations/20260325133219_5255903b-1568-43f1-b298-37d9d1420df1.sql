-- ============================================================
-- CampanhaOS — Schema Completo v1
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL DEFAULT '',
  email      TEXT,
  phone      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Profiles visíveis por autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuário cria próprio perfil" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- APP ROLE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin_master','coordenador_geral','coordenador_estadual',
      'coordenador_regional','coordenador_microrregional','coordenador_municipal',
      'lideranca_local','operador_campo','analista_inteligencia',
      'analista_pesquisa','executivo_leitura'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            public.app_role NOT NULL,
  macroregion_id  TEXT,
  microregion     TEXT,
  municipality    TEXT,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_master','coordenador_geral','coordenador_estadual')
  );
$$;

CREATE POLICY "User roles visíveis por autenticados" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insere roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin atualiza roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin deleta roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- MACROREGIONS
CREATE TABLE IF NOT EXISTS public.macroregions (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  coordinator          TEXT,
  municipalities_count INT NOT NULL DEFAULT 0,
  center_lat           NUMERIC,
  center_lng           NUMERIC,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.macroregions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Macrorregiões visíveis por autenticados" ON public.macroregions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia macrorregiões" ON public.macroregions
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- ACTION ENUMs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_status') THEN
    CREATE TYPE public.action_status AS ENUM (
      'prevista','confirmada','em_andamento','realizada',
      'atrasada','cancelada','pendente_validacao'
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_type') THEN
    CREATE TYPE public.action_type AS ENUM (
      'reuniao_politica','visita_institucional','mobilizacao_comunitaria',
      'adesivacao','panfletagem','carreata','evento_regional',
      'agenda_candidato','reuniao_empresarios','encontro_liderancas','acao_digital'
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE public.priority_level AS ENUM ('critica','alta','media','baixa');
  END IF;
END $$;

-- ACTIONS
CREATE TABLE IF NOT EXISTS public.actions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  type                  public.action_type NOT NULL DEFAULT 'mobilizacao_comunitaria',
  category              TEXT,
  description           TEXT,
  municipality          TEXT,
  microregion           TEXT,
  macroregion_id        TEXT REFERENCES public.macroregions(id),
  address               TEXT,
  lat                   NUMERIC,
  lng                   NUMERIC,
  responsible           TEXT,
  team                  TEXT[] NOT NULL DEFAULT '{}',
  planned_date          DATE NOT NULL,
  planned_time          TIME,
  priority              public.priority_level NOT NULL DEFAULT 'media',
  target_audience       TEXT,
  estimated_impact      INT NOT NULL DEFAULT 0,
  status                public.action_status NOT NULL DEFAULT 'prevista',
  observations          TEXT,
  executed_date         DATE,
  executed_people_count INT,
  evidence_photos       TEXT[] NOT NULL DEFAULT '{}',
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES auth.users(id),
  updated_by            UUID REFERENCES auth.users(id)
);
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_actions_updated_at BEFORE UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_actions_status ON public.actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_macroregion ON public.actions(macroregion_id);
CREATE INDEX IF NOT EXISTS idx_actions_deleted_at ON public.actions(deleted_at);

CREATE POLICY "Ações visíveis por autenticados" ON public.actions
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Autenticados criam ações" ON public.actions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam ações" ON public.actions
  FOR UPDATE TO authenticated USING (true);

-- ACTION HISTORY
CREATE TABLE IF NOT EXISTS public.action_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id       UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  changed_by      UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  old_status      public.action_status,
  new_status      public.action_status,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_action_history_action ON public.action_history(action_id);
CREATE POLICY "Histórico visível por autenticados" ON public.action_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados inserem histórico" ON public.action_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- POLITICAL ASSETS ENUMs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
    CREATE TYPE public.asset_type AS ENUM (
      'prefeito','ex_prefeito','pretenso_prefeito','vereador','ex_vereador',
      'pretenso_vereador','lideranca_comunitaria','lideranca_empresarial',
      'lideranca_religiosa','presidente_entidade','influenciador_regional',
      'coordenador_partidario'
    );
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alignment_status') THEN
    CREATE TYPE public.alignment_status AS ENUM (
      'alinhado','provavel','neutro','oposicao','indefinido'
    );
  END IF;
END $$;

-- POLITICAL ASSETS
CREATE TABLE IF NOT EXISTS public.political_assets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  type               public.asset_type NOT NULL DEFAULT 'lideranca_comunitaria',
  municipality       TEXT,
  microregion        TEXT,
  macroregion_id     TEXT REFERENCES public.macroregions(id),
  position           TEXT,
  influence_level    INT NOT NULL DEFAULT 5 CHECK (influence_level BETWEEN 1 AND 10),
  alignment_status   public.alignment_status NOT NULL DEFAULT 'neutro',
  support_status     TEXT,
  phone              TEXT,
  email              TEXT,
  lat                NUMERIC,
  lng                NUMERIC,
  observations       TEXT,
  relationship_owner TEXT,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID REFERENCES auth.users(id),
  updated_by         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.political_assets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.political_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_assets_macroregion ON public.political_assets(macroregion_id);
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON public.political_assets(deleted_at);

CREATE POLICY "Ativos visíveis por autenticados" ON public.political_assets
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Autenticados criam ativos" ON public.political_assets
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam ativos" ON public.political_assets
  FOR UPDATE TO authenticated USING (true);

-- CAMPAIGN MEMBERS
CREATE TABLE IF NOT EXISTS public.campaign_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id),
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  role             TEXT NOT NULL DEFAULT 'Coordenador',
  hierarchy_level  INT NOT NULL DEFAULT 4 CHECK (hierarchy_level BETWEEN 1 AND 5),
  macroregion_id   TEXT REFERENCES public.macroregions(id),
  microregion      TEXT,
  municipality     TEXT,
  supervisor_id    UUID REFERENCES public.campaign_members(id),
  actions_managed  INT NOT NULL DEFAULT 0,
  completion_rate  NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'ativo',
  observations     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id)
);
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.campaign_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_members_level ON public.campaign_members(hierarchy_level);

CREATE POLICY "Membros visíveis por autenticados" ON public.campaign_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam membros" ON public.campaign_members
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam membros" ON public.campaign_members
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin deleta membros" ON public.campaign_members
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ALERTS ENUMs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_level') THEN
    CREATE TYPE public.alert_level AS ENUM ('critico','atencao','oportunidade','info');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
    CREATE TYPE public.alert_status AS ENUM ('novo','em_analise','resolvido');
  END IF;
END $$;

-- ALERTS
CREATE TABLE IF NOT EXISTS public.alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level             public.alert_level NOT NULL DEFAULT 'info',
  title             TEXT NOT NULL,
  description       TEXT,
  territory         TEXT,
  macroregion_id    TEXT REFERENCES public.macroregions(id),
  recommendation    TEXT,
  status            public.alert_status NOT NULL DEFAULT 'novo',
  severity          INT NOT NULL DEFAULT 5 CHECK (severity BETWEEN 1 AND 10),
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  is_read           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ,
  created_by        UUID REFERENCES auth.users(id)
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_alerts_level ON public.alerts(level);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);

CREATE POLICY "Alertas visíveis por autenticados" ON public.alerts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia alertas" ON public.alerts
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Autenticados inserem alertas" ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados atualizam alertas" ON public.alerts
  FOR UPDATE TO authenticated USING (true);

-- DASHBOARD KPIs FUNCTION
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'total_actions',        COUNT(*),
    'completed_actions',    COUNT(*) FILTER (WHERE status = 'realizada'),
    'delayed_actions',      COUNT(*) FILTER (WHERE status = 'atrasada'),
    'in_progress_actions',  COUNT(*) FILTER (WHERE status = 'em_andamento'),
    'pending_validation',   COUNT(*) FILTER (WHERE status = 'pendente_validacao'),
    'total_people_impacted',COALESCE(SUM(executed_people_count) FILTER (WHERE status = 'realizada'), 0),
    'completion_rate',      ROUND(
      CASE WHEN COUNT(*) > 0
        THEN COUNT(*) FILTER (WHERE status = 'realizada') * 100.0 / COUNT(*)
        ELSE 0
      END, 1
    )
  )
  FROM public.actions
  WHERE deleted_at IS NULL;
$$;

-- SEED MACROREGIONS
INSERT INTO public.macroregions (id, name, coordinator, municipalities_count, center_lat, center_lng) VALUES
  ('rmc',            'Curitiba / RMC',   'Carlos Mendonça',    41, -25.4244, -49.2654),
  ('norte_central',  'Norte Central',    'Fernanda Rocha',     79, -23.3045, -51.1696),
  ('noroeste',       'Noroeste',         'Roberto Silveira',   53, -23.2068, -53.0000),
  ('oeste',          'Oeste',            'Ana Paula Ferreira', 50, -25.0916, -53.6085),
  ('sudoeste',       'Sudoeste',         'Marcelo Cunha',      37, -25.7682, -52.8744),
  ('centro_sul',     'Centro-Sul',       'Juliana Teixeira',   29, -25.7824, -51.8950),
  ('campos_gerais',  'Campos Gerais',    'Eduardo Pinheiro',   22, -24.7789, -50.0161),
  ('norte_pioneiro', 'Norte Pioneiro',   'Sônia Batista',      46, -23.5000, -50.4000)
ON CONFLICT (id) DO NOTHING;