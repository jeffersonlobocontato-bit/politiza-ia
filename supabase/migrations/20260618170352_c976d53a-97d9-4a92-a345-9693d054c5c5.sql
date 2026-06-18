
CREATE TYPE public.evento_status AS ENUM ('rascunho','publicado','encerrado','cancelado');
CREATE TYPE public.inscricao_status AS ENUM ('confirmada','cancelada','presente','ausente');

CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_capa_url TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ,
  local_nome TEXT,
  endereco TEXT,
  municipio TEXT,
  macroregion_id TEXT REFERENCES public.macroregions(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  link_online TEXT,
  capacidade_maxima INTEGER,
  status public.evento_status NOT NULL DEFAULT 'rascunho',
  exige_aprovacao BOOLEAN NOT NULL DEFAULT FALSE,
  campos_extra JSONB DEFAULT '[]'::jsonb,
  tema_paleta_id TEXT NOT NULL DEFAULT 'mint',
  tema_cor_primaria TEXT NOT NULL DEFAULT '#2FA85A',
  tema_cor_primaria_escura TEXT NOT NULL DEFAULT '#1F8444',
  tema_cor_overlay TEXT NOT NULL DEFAULT 'rgba(10, 15, 31, 0.55)',
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.eventos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_select_public" ON public.eventos
  FOR SELECT USING (status = 'publicado' OR auth.role() = 'authenticated');
CREATE POLICY "eventos_insert" ON public.eventos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "eventos_update" ON public.eventos
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
            AND role IN ('admin_master','coordenador_geral','coordenador_estadual'))
  );
CREATE POLICY "eventos_delete" ON public.eventos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
            AND role IN ('admin_master','coordenador_geral'))
  );

CREATE TABLE public.inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT NOT NULL,
  municipio TEXT NOT NULL,
  cargo_interesse TEXT,
  partido TEXT,
  observacoes TEXT,
  respostas_extra JSONB DEFAULT '{}'::jsonb,
  codigo_confirmacao TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  status public.inscricao_status NOT NULL DEFAULT 'confirmada',
  checkin_at TIMESTAMPTZ,
  ip_origem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evento_id, telefone)
);

GRANT INSERT ON public.inscricoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes TO authenticated;
GRANT ALL ON public.inscricoes TO service_role;

ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inscricoes_insert_public" ON public.inscricoes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "inscricoes_select_internal" ON public.inscricoes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inscricoes_update_internal" ON public.inscricoes
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "inscricoes_delete_internal" ON public.inscricoes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
            AND role IN ('admin_master','coordenador_geral'))
  );

CREATE INDEX idx_eventos_slug ON public.eventos(slug);
CREATE INDEX idx_eventos_status ON public.eventos(status);
CREATE INDEX idx_eventos_data ON public.eventos(data_inicio);
CREATE INDEX idx_eventos_candidate ON public.eventos(candidate_id);
CREATE INDEX idx_inscricoes_evento ON public.inscricoes(evento_id);
CREATE INDEX idx_inscricoes_codigo ON public.inscricoes(codigo_confirmacao);
CREATE INDEX idx_inscricoes_status ON public.inscricoes(status);

CREATE OR REPLACE FUNCTION public.check_inscricao_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent_count INTEGER;
BEGIN
  IF NEW.ip_origem IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_count FROM public.inscricoes
    WHERE ip_origem = NEW.ip_origem AND evento_id = NEW.evento_id
      AND created_at > NOW() - INTERVAL '1 minute';
    IF recent_count >= 3 THEN
      RAISE EXCEPTION 'Muitas tentativas de inscrição. Aguarde um momento.';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_inscricao_rate_limit BEFORE INSERT ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.check_inscricao_rate_limit();

CREATE OR REPLACE FUNCTION public.update_eventos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER eventos_updated_at BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_eventos_updated_at();

CREATE OR REPLACE VIEW public.eventos_com_contagem AS
SELECT e.*,
  COUNT(i.id) FILTER (WHERE i.status IN ('confirmada','presente')) AS total_inscritos,
  COUNT(i.id) FILTER (WHERE i.status = 'presente') AS total_presentes
FROM public.eventos e
LEFT JOIN public.inscricoes i ON i.evento_id = e.id
GROUP BY e.id;

GRANT SELECT ON public.eventos_com_contagem TO anon, authenticated;
