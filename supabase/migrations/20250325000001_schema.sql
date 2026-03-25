-- CampanhaOS Full Schema
CREATE TYPE public.app_role AS ENUM ('admin_master','coordenador_geral','coordenador_estadual','coordenador_regional','coordenador_microrregional','coordenador_municipal','lideranca_local','operador_campo','analista_inteligencia','analista_pesquisa','executivo_leitura');
CREATE TYPE public.action_status AS ENUM ('prevista','confirmada','em_andamento','realizada','atrasada','cancelada','pendente_validacao');
CREATE TYPE public.action_type AS ENUM ('reuniao_politica','visita_institucional','mobilizacao_comunitaria','adesivacao','panfletagem','carreata','evento_regional','agenda_candidato','reuniao_empresarios','encontro_liderancas','acao_digital');
CREATE TYPE public.priority_level AS ENUM ('critica','alta','media','baixa');
CREATE TYPE public.alignment_status AS ENUM ('alinhado','provavel','neutro','oposicao','indefinido');
CREATE TYPE public.asset_type AS ENUM ('prefeito','ex_prefeito','pretenso_prefeito','vereador','ex_vereador','pretenso_vereador','lideranca_comunitaria','lideranca_empresarial','lideranca_religiosa','presidente_entidade','influenciador_regional','coordenador_partidario');
CREATE TYPE public.alert_level AS ENUM ('critico','atencao','oportunidade','info');
CREATE TYPE public.alert_status AS ENUM ('novo','em_analise','resolvido');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  macroregion_id TEXT,
  microregion TEXT,
  municipality TEXT,
  UNIQUE (user_id, role)
);

CREATE TABLE public.macro_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  coordinator TEXT,
  municipalities_count INTEGER DEFAULT 0,
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.municipalities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  macroregion_id TEXT REFERENCES public.macro_regions(id),
  microregion TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  population INTEGER DEFAULT 0,
  electoral_voters INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  hierarchy_level INTEGER NOT NULL DEFAULT 3 CHECK (hierarchy_level BETWEEN 1 AND 5),
  macroregion_id TEXT REFERENCES public.macro_regions(id),
  microregion TEXT,
  municipality TEXT,
  supervisor_id UUID REFERENCES public.campaign_members(id),
  actions_managed INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 100),
  status TEXT DEFAULT 'ativo',
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type public.action_type NOT NULL DEFAULT 'mobilizacao_comunitaria',
  category TEXT DEFAULT 'Campo',
  description TEXT,
  municipality TEXT,
  microregion TEXT,
  macroregion_id TEXT REFERENCES public.macro_regions(id),
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  responsible TEXT,
  team TEXT[] DEFAULT '{}',
  planned_date DATE NOT NULL,
  planned_time TIME,
  priority public.priority_level NOT NULL DEFAULT 'media',
  target_audience TEXT,
  estimated_impact INTEGER DEFAULT 0,
  status public.action_status NOT NULL DEFAULT 'prevista',
  observations TEXT,
  executed_date DATE,
  executed_people_count INTEGER,
  evidence_photos TEXT[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  old_status public.action_status,
  new_status public.action_status,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.political_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.asset_type NOT NULL DEFAULT 'lideranca_comunitaria',
  municipality TEXT,
  microregion TEXT,
  macroregion_id TEXT REFERENCES public.macro_regions(id),
  position TEXT,
  influence_level INTEGER DEFAULT 5 CHECK (influence_level BETWEEN 1 AND 10),
  alignment_status public.alignment_status NOT NULL DEFAULT 'indefinido',
  support_status TEXT DEFAULT 'Em análise',
  phone TEXT,
  email TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  observations TEXT,
  relationship_owner TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.electoral_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute TEXT NOT NULL,
  collection_date DATE NOT NULL,
  release_date DATE NOT NULL,
  scope TEXT DEFAULT 'estadual',
  territory TEXT DEFAULT 'Paraná',
  sample_size INTEGER DEFAULT 0,
  margin_of_error DECIMAL(4,2) DEFAULT 0,
  methodology TEXT,
  tse_registration TEXT,
  cargos TEXT[] DEFAULT '{}',
  observations TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.electoral_surveys(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL,
  scenario_label TEXT NOT NULL,
  question_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.survey_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_excluded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.alert_level NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  territory TEXT,
  macroregion_id TEXT REFERENCES public.macro_regions(id),
  recommendation TEXT,
  status public.alert_status NOT NULL DEFAULT 'novo',
  severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  is_auto_generated BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actions_status ON public.actions(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_actions_macroregion ON public.actions(macroregion_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_political_assets_macroregion ON public.political_assets(macroregion_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_members_level ON public.campaign_members(hierarchy_level);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_actions_upd BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_assets_upd BEFORE UPDATE ON public.political_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_members_upd BEFORE UPDATE ON public.campaign_members FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_surveys_upd BEFORE UPDATE ON public.electoral_surveys FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin_master','coordenador_geral','coordenador_estadual'));
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_actions', COUNT(*) FILTER (WHERE deleted_at IS NULL),
    'completed_actions', COUNT(*) FILTER (WHERE status = 'realizada' AND deleted_at IS NULL),
    'delayed_actions', COUNT(*) FILTER (WHERE status = 'atrasada' AND deleted_at IS NULL),
    'in_progress_actions', COUNT(*) FILTER (WHERE status = 'em_andamento' AND deleted_at IS NULL),
    'pending_validation', COUNT(*) FILTER (WHERE status = 'pendente_validacao' AND deleted_at IS NULL),
    'total_people_impacted', COALESCE(SUM(executed_people_count) FILTER (WHERE status = 'realizada' AND deleted_at IS NULL), 0),
    'completion_rate', CASE WHEN COUNT(*) FILTER (WHERE deleted_at IS NULL) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'realizada' AND deleted_at IS NULL)::DECIMAL / COUNT(*) FILTER (WHERE deleted_at IS NULL)) * 100, 1)
      ELSE 0 END
  ) FROM public.actions;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.political_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electoral_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "roles_manage" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "macro_select" ON public.macro_regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "macro_manage" ON public.macro_regions FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "muni_select" ON public.municipalities FOR SELECT TO authenticated USING (true);
CREATE POLICY "muni_manage" ON public.municipalities FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "members_select" ON public.campaign_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_insert" ON public.campaign_members FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "members_update" ON public.campaign_members FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "members_delete" ON public.campaign_members FOR DELETE USING (public.is_admin(auth.uid()));
CREATE POLICY "actions_select" ON public.actions FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "actions_insert" ON public.actions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "actions_update" ON public.actions FOR UPDATE USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "history_select" ON public.action_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert" ON public.action_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "assets_select" ON public.political_assets FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "assets_insert" ON public.political_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "assets_update" ON public.political_assets FOR UPDATE USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "surveys_select" ON public.electoral_surveys FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "surveys_insert" ON public.electoral_surveys FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "surveys_update" ON public.electoral_surveys FOR UPDATE USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "sq_all" ON public.survey_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sr_all" ON public.survey_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts_insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "alerts_update" ON public.alerts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "alerts_delete" ON public.alerts FOR DELETE USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.macro_regions (id, name, coordinator, municipalities_count, center_lat, center_lng) VALUES
  ('rmc', 'Curitiba / RMC', 'Carlos Mendonça', 41, -25.4244, -49.2654),
  ('norte_central', 'Norte Central', 'Fernanda Rocha', 79, -23.3045, -51.1696),
  ('noroeste', 'Noroeste', 'Roberto Silveira', 53, -23.2068, -53.0000),
  ('oeste', 'Oeste', 'Ana Paula Ferreira', 50, -25.0916, -53.6085),
  ('sudoeste', 'Sudoeste', 'Marcelo Cunha', 37, -25.7682, -52.8744),
  ('centro_sul', 'Centro-Sul', 'Juliana Teixeira', 29, -25.7824, -51.8950),
  ('campos_gerais', 'Campos Gerais', 'Eduardo Pinheiro', 22, -24.7789, -50.0161),
  ('norte_pioneiro', 'Norte Pioneiro', 'Sônia Batista', 46, -23.5000, -50.4000);

INSERT INTO public.municipalities (id, name, macroregion_id, microregion, lat, lng, population, electoral_voters) VALUES
  ('curitiba', 'Curitiba', 'rmc', 'Curitiba', -25.4244, -49.2654, 1963726, 1181000),
  ('londrina', 'Londrina', 'norte_central', 'Londrina', -23.3045, -51.1696, 575482, 363000),
  ('maringa', 'Maringá', 'norte_central', 'Maringá', -23.4273, -51.9375, 436472, 288000),
  ('cascavel', 'Cascavel', 'oeste', 'Cascavel', -24.9557, -53.4558, 345249, 228000),
  ('foz_iguacu', 'Foz do Iguaçu', 'oeste', 'Foz do Iguaçu', -25.5478, -54.5882, 260348, 167000),
  ('sao_jose_dos_pinhais', 'São José dos Pinhais', 'rmc', 'Curitiba', -25.5317, -49.2068, 349043, 218000),
  ('colombo', 'Colombo', 'rmc', 'Curitiba', -25.2967, -49.2233, 261899, 160000),
  ('ponta_grossa', 'Ponta Grossa', 'campos_gerais', 'Ponta Grossa', -25.0945, -50.1633, 355498, 228000),
  ('guarapuava', 'Guarapuava', 'centro_sul', 'Guarapuava', -25.3950, -51.4600, 186185, 116000),
  ('pato_branco', 'Pato Branco', 'sudoeste', 'Pato Branco', -26.2273, -52.6714, 84374, 55000),
  ('francisco_beltrao', 'Francisco Beltrão', 'sudoeste', 'Sudoeste', -26.0814, -53.0540, 92951, 62000),
  ('apucarana', 'Apucarana', 'norte_central', 'Apucarana', -23.5516, -51.4614, 134891, 87000),
  ('umuarama', 'Umuarama', 'noroeste', 'Umuarama', -23.7669, -53.3243, 113558, 73000),
  ('cornelio_procopio', 'Cornélio Procópio', 'norte_pioneiro', 'Norte Pioneiro', -23.1829, -50.6449, 48025, 32000),
  ('toledo', 'Toledo', 'oeste', 'Toledo', -24.7260, -53.7435, 145371, 96000),
  ('paranagua', 'Paranaguá', 'rmc', 'Litoral', -25.5196, -48.5073, 154936, 96000),
  ('jacarezinho', 'Jacarezinho', 'norte_pioneiro', 'Norte Pioneiro', -23.1597, -49.9707, 40694, 27000),
  ('campo_mourao', 'Campo Mourão', 'norte_central', 'Campo Mourão', -24.0457, -52.3836, 94622, 63000),
  ('irati', 'Irati', 'centro_sul', 'Irati', -25.4680, -50.6534, 60282, 39000);
