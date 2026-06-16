
CREATE TYPE public.emenda_tipo AS ENUM ('individual','bancada','politicas_publicas','comissao');
CREATE TYPE public.emenda_status AS ENUM ('pago','empenhado','em_execucao','em_analise','minuta_aprovado','pendente','sem_processo');
CREATE TYPE public.emenda_faixa AS ENUM ('f1_micro','f2_pequena','f3_media','f4_relevante','f5_alta','f6_muito_alta','f7_estrategica');

CREATE TABLE public.emendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercicio INTEGER NOT NULL CHECK (exercicio BETWEEN 2020 AND 2035),
  tipo public.emenda_tipo NOT NULL DEFAULT 'individual',
  numero_emenda TEXT,
  orgao_gestor TEXT,
  area_tematica TEXT,
  acao_orcamentaria TEXT,
  ente_federativo TEXT NOT NULL,
  unidade_beneficiaria TEXT,
  municipio TEXT,
  macroregion_id TEXT REFERENCES public.macroregions(id) ON DELETE SET NULL,
  finalidade TEXT,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_custeio NUMERIC(15,2) DEFAULT 0,
  valor_investimento NUMERIC(15,2) DEFAULT 0,
  valor_empenhado NUMERIC(15,2) DEFAULT 0,
  valor_pago NUMERIC(15,2) DEFAULT 0,
  instrumento_repasse TEXT,
  numero_empenho TEXT,
  data_empenho DATE,
  numero_ordem_bancaria TEXT,
  data_pagamento DATE,
  status_raw TEXT,
  status public.emenda_status NOT NULL DEFAULT 'sem_processo',
  faixa_valor public.emenda_faixa GENERATED ALWAYS AS (
    CASE
      WHEN valor_total <= 100000 THEN 'f1_micro'::public.emenda_faixa
      WHEN valor_total <= 200000 THEN 'f2_pequena'::public.emenda_faixa
      WHEN valor_total <= 500000 THEN 'f3_media'::public.emenda_faixa
      WHEN valor_total <= 1000000 THEN 'f4_relevante'::public.emenda_faixa
      WHEN valor_total <= 2000000 THEN 'f5_alta'::public.emenda_faixa
      WHEN valor_total <= 5000000 THEN 'f6_muito_alta'::public.emenda_faixa
      ELSE 'f7_estrategica'::public.emenda_faixa
    END
  ) STORED,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  observacoes_internas TEXT,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emendas TO authenticated;
GRANT ALL ON public.emendas TO service_role;

CREATE INDEX idx_emendas_exercicio ON public.emendas(exercicio);
CREATE INDEX idx_emendas_status ON public.emendas(status);
CREATE INDEX idx_emendas_faixa ON public.emendas(faixa_valor);
CREATE INDEX idx_emendas_area ON public.emendas(area_tematica);
CREATE INDEX idx_emendas_municipio ON public.emendas(municipio);
CREATE INDEX idx_emendas_macroregion ON public.emendas(macroregion_id);
CREATE INDEX idx_emendas_candidate ON public.emendas(candidate_id);
CREATE INDEX idx_emendas_geo ON public.emendas(lat, lng) WHERE lat IS NOT NULL;

ALTER TABLE public.emendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emendas_select" ON public.emendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "emendas_insert" ON public.emendas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "emendas_update" ON public.emendas FOR UPDATE TO authenticated USING (
  auth.uid() = created_by OR public.is_admin(auth.uid())
);
CREATE POLICY "emendas_delete" ON public.emendas FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'coordenador_geral')
);

CREATE OR REPLACE FUNCTION public.update_emendas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER emendas_updated_at
  BEFORE UPDATE ON public.emendas
  FOR EACH ROW EXECUTE FUNCTION public.update_emendas_updated_at();
