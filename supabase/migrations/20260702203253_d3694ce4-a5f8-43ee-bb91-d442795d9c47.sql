-- Módulo: Malha Logística de Campo (22 cidades principais + 399 municípios)
-- Acesso de edição restrito a: admin_master e coordenador_estadual

-- 1) Novo tipo de ação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'action_type' AND e.enumlabel = 'ativacao_campo'
  ) THEN
    ALTER TYPE public.action_type ADD VALUE 'ativacao_campo';
  END IF;
END $$;

-- 2) Função de permissão dedicada
CREATE OR REPLACE FUNCTION public.is_malha_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_master', 'coordenador_estadual')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_malha_admin(uuid) FROM PUBLIC, anon;

-- 3) Tabela de municípios da malha
CREATE TABLE IF NOT EXISTS public.pr_municipios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo_ibge text,
  is_hub boolean NOT NULL DEFAULT false,
  hub_id uuid REFERENCES public.pr_municipios(id) ON DELETE SET NULL,
  posicao_ciclo integer,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  pessoas_sede integer NOT NULL DEFAULT 20,
  pessoas_campo integer NOT NULL DEFAULT 10,
  criado_manualmente boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (hub_id, posicao_ciclo)
);

CREATE INDEX IF NOT EXISTS idx_pr_municipios_hub ON public.pr_municipios(hub_id);
CREATE INDEX IF NOT EXISTS idx_pr_municipios_is_hub ON public.pr_municipios(is_hub);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pr_municipios TO authenticated;
GRANT ALL ON public.pr_municipios TO service_role;

ALTER TABLE public.pr_municipios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pr_municipios_select" ON public.pr_municipios;
CREATE POLICY "pr_municipios_select" ON public.pr_municipios
  FOR SELECT TO authenticated USING (public.is_malha_admin(auth.uid()));

DROP POLICY IF EXISTS "pr_municipios_all" ON public.pr_municipios;
CREATE POLICY "pr_municipios_all" ON public.pr_municipios
  FOR ALL TO authenticated
  USING (public.is_malha_admin(auth.uid()))
  WITH CHECK (public.is_malha_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_pr_municipios_upd ON public.pr_municipios;
CREATE TRIGGER trg_pr_municipios_upd BEFORE UPDATE ON public.pr_municipios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Carga inicial — 22 cidades principais
INSERT INTO public.pr_municipios (nome, codigo_ibge, is_hub, lat, lng) VALUES
  ('Curitiba', '4106902', true, -25.4195, -49.2646),
  ('São José dos Pinhais', '4125506', true, -25.5313, -49.2031),
  ('Colombo', '4105805', true, -25.2925, -49.2262),
  ('Araucária', '4101804', true, -25.5859, -49.4047),
  ('Fazenda Rio Grande', '4107652', true, -25.6624, -49.3073),
  ('Campo Largo', '4104204', true, -25.4525, -49.529),
  ('Pinhais', '4119152', true, -25.4429, -49.1927),
  ('Almirante Tamandaré', '4100400', true, -25.3188, -49.3037),
  ('Piraquara', '4119509', true, -25.4422, -49.0624),
  ('Paranaguá', '4118204', true, -25.5161, -48.5225),
  ('Londrina', '4113700', true, -23.304, -51.1691),
  ('Cambé', '4103701', true, -23.2766, -51.2798),
  ('Maringá', '4115200', true, -23.4205, -51.9333),
  ('Sarandi', '4126256', true, -23.4441, -51.876),
  ('Apucarana', '4101408', true, -23.55, -51.4635),
  ('Arapongas', '4101507', true, -23.4153, -51.4259),
  ('Umuarama', '4128104', true, -23.7656, -53.3201),
  ('Ponta Grossa', '4119905', true, -25.0916, -50.1668),
  ('Cascavel', '4104808', true, -24.9573, -53.459),
  ('Foz do Iguaçu', '4108304', true, -25.5427, -54.5827),
  ('Toledo', '4127700', true, -24.7246, -53.7412),
  ('Guarapuava', '4109401', true, -25.3902, -51.4623)
ON CONFLICT DO NOTHING;

-- 5) Carga inicial — 377 cidades satélite
INSERT INTO public.pr_municipios (nome, codigo_ibge, is_hub, hub_id, posicao_ciclo, lat, lng) VALUES
  ('Cerro Azul', '4105201', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Curitiba' AND is_hub LIMIT 1), 1, -26.0891, -52.8691),
  ('Doutor Ulysses', '4128633', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Curitiba' AND is_hub LIMIT 1), 2, -24.5665, -49.4219),
  ('Adrianópolis', '4100202', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Curitiba' AND is_hub LIMIT 1), 3, -24.6606, -48.9922),
  ('Tunas do Paraná', '4127882', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Curitiba' AND is_hub LIMIT 1), 4, -24.9731, -49.0879),
  ('Mandirituba', '4114302', false, (SELECT id FROM public.pr_municipios WHERE nome = 'São José dos Pinhais' AND is_hub LIMIT 1), 1, -25.777, -49.3282),
  ('Piên', '4119103', false, (SELECT id FROM public.pr_municipios WHERE nome = 'São José dos Pinhais' AND is_hub LIMIT 1), 2, -26.0965, -49.4336),
  ('Campina Grande do Sul', '4104006', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Colombo' AND is_hub LIMIT 1), 1, -25.3044, -49.0551),
  ('Quatro Barras', '4120804', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Colombo' AND is_hub LIMIT 1), 2, -25.3673, -49.0763),
  ('Rio Negro', '4122305', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Araucária' AND is_hub LIMIT 1), 1, -26.095, -49.7982),
  ('Quitandinha', '4121208', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Fazenda Rio Grande' AND is_hub LIMIT 1), 1, -25.8734, -49.4973),
  ('Campo do Tenente', '4104105', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Fazenda Rio Grande' AND is_hub LIMIT 1), 2, -25.98, -49.6844),
  ('Balsa Nova', '4102307', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Campo Largo' AND is_hub LIMIT 1), 1, -25.5804, -49.6291),
  ('Campo Magro', '4104253', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Campo Largo' AND is_hub LIMIT 1), 2, -25.3687, -49.4501),
  ('Contenda', '4106209', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Campo Largo' AND is_hub LIMIT 1), 3, -25.6788, -49.535),
  ('Lapa', '4113205', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Pinhais' AND is_hub LIMIT 1), 1, -25.7671, -49.7168),
  ('Porto Amazonas', '4120101', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Pinhais' AND is_hub LIMIT 1), 2, -25.54, -49.8946),
  ('Rio Branco do Sul', '4122206', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Almirante Tamandaré' AND is_hub LIMIT 1), 1, -25.1892, -49.3115),
  ('Bocaiúva do Sul', '4103107', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Almirante Tamandaré' AND is_hub LIMIT 1), 2, -25.2066, -49.1141),
  ('Itaperuçu', '4111258', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Almirante Tamandaré' AND is_hub LIMIT 1), 3, -25.2193, -49.3454),
  ('Agudos do Sul', '4100301', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Piraquara' AND is_hub LIMIT 1), 1, -25.9899, -49.3343),
  ('Tijucas do Sul', '4127601', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Piraquara' AND is_hub LIMIT 1), 2, -25.9311, -49.195),
  ('Antonina', '4101200', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Paranaguá' AND is_hub LIMIT 1), 1, -25.4386, -48.7191),
  ('Guaraqueçaba', '4109500', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Paranaguá' AND is_hub LIMIT 1), 2, -25.3071, -48.3204),
  ('Guaratuba', '4109609', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Paranaguá' AND is_hub LIMIT 1), 3, -25.8817, -48.5752),
  ('Matinhos', '4115705', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Paranaguá' AND is_hub LIMIT 1), 4, -25.8237, -48.549),
  ('Morretes', '4116208', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Paranaguá' AND is_hub LIMIT 1), 5, -25.4744, -48.8345),
  ('Pontal do Paraná', '4119954', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Paranaguá' AND is_hub LIMIT 1), 6, -25.6735, -48.5111),
  ('Ibiporã', '4109807', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 1, -23.2659, -51.0522),
  ('Pitangueiras', '4119657', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 2, -23.2281, -51.5873),
  ('Rolândia', '4122404', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 3, -23.3101, -51.3659),
  ('Tamarana', '4126678', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 4, -23.7204, -51.0991),
  ('Alvorada do Sul', '4100806', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 5, -22.7813, -51.2297),
  ('Bela Vista do Paraíso', '4102802', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 6, -22.9937, -51.1927),
  ('Florestópolis', '4108007', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 7, -22.8623, -51.3882),
  ('Miraselva', '4116000', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 8, -22.9657, -51.4846),
  ('Porecatu', '4120002', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 9, -22.7537, -51.3795),
  ('Prado Ferreira', '4120333', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 10, -23.0357, -51.4429),
  ('Primeiro de Maio', '4120507', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 11, -22.8517, -51.0293),
  ('Sertanópolis', '4126504', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 12, -23.0571, -51.0399),
  ('Abatiá', '4100103', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 13, -23.3049, -50.3133),
  ('Andirá', '4101101', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 14, -23.0533, -50.2304),
  ('Bandeirantes', '4102406', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 15, -23.1078, -50.3704),
  ('Congonhinhas', '4106001', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 16, -23.5493, -50.5569),
  ('Cornélio Procópio', '4106407', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 17, -23.1829, -50.6498),
  ('Itambaracá', '4111001', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 18, -23.0181, -50.4097),
  ('Leópolis', '4113403', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 19, -23.0818, -50.7511),
  ('Nova América da Colina', '4116604', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 20, -23.3308, -50.7168),
  ('Nova Fátima', '4117008', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 21, -23.4324, -50.5665),
  ('Ribeirão do Pinhal', '4121901', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 22, -23.4091, -50.3601),
  ('Santa Amélia', '4123105', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 23, -23.2654, -50.4288),
  ('Santa Mariana', '4123907', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 24, -23.1465, -50.5167),
  ('Santo Antônio do Paraíso', '4124301', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 25, -23.4969, -50.6455),
  ('Sertaneja', '4126405', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 26, -23.0361, -50.8317),
  ('Assaí', '4101903', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 27, -23.3697, -50.8459),
  ('Jataizinho', '4112702', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 28, -23.2578, -50.9777),
  ('Nova Santa Bárbara', '4117214', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 29, -23.5865, -50.7598),
  ('Rancho Alegre', '4121307', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 30, -23.0676, -50.9145),
  ('Santa Cecília do Pavão', '4123204', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 31, -23.5201, -50.7835),
  ('São Jerônimo da Serra', '4124707', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 32, -23.7218, -50.7475),
  ('São Sebastião da Amoreira', '4126009', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 33, -23.4656, -50.7625),
  ('Uraí', '4128401', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 34, -23.2, -50.7939),
  ('Barra do Jacaré', '4102703', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 35, -23.116, -50.1842),
  ('Cambará', '4103602', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 36, -23.0423, -50.0753),
  ('Jacarezinho', '4111803', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 37, -23.1591, -49.9739),
  ('Jundiaí do Sul', '4112900', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 38, -23.4357, -50.2496),
  ('Ribeirão Claro', '4121802', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 39, -23.1941, -49.7597),
  ('Santo Antônio da Platina', '4124103', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 40, -23.2959, -50.0815),
  ('Conselheiro Mairinck', '4106100', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 41, -23.623, -50.1707),
  ('Curiúva', '4107009', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 42, -24.0362, -50.4576),
  ('Figueira', '4107751', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 43, -23.8455, -50.4031),
  ('Ibaiti', '4109708', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 44, -23.8478, -50.1932),
  ('Jaboti', '4111704', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 45, -23.7435, -50.0729),
  ('Japira', '4112306', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 46, -23.8142, -50.1422),
  ('Pinhalão', '4119202', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 47, -23.7982, -50.0536),
  ('Sapopema', '4126207', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 48, -23.9078, -50.5801),
  ('Carlópolis', '4104709', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 49, -23.4269, -49.7235),
  ('Guapirama', '4109005', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 50, -23.5203, -50.0407),
  ('Joaquim Távora', '4112801', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 51, -23.4987, -49.909),
  ('Quatiguá', '4120705', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 52, -23.5671, -49.916),
  ('Salto do Itararé', '4122909', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 53, -23.6074, -49.6354),
  ('Santana do Itararé', '4124004', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 54, -23.7587, -49.6293),
  ('São José da Boa Vista', '4125407', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 55, -23.9122, -49.6577),
  ('Siqueira Campos', '4126603', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 56, -23.6875, -49.8304),
  ('Tomazina', '4127809', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 57, -23.7796, -49.9499),
  ('Wenceslau Braz', '4128500', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Londrina' AND is_hub LIMIT 1), 58, -23.8742, -49.8032),
  ('Mandaguari', '4114203', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 1, -23.5446, -51.671),
  ('Marialva', '4114807', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 2, -23.4843, -51.7928),
  ('Paiçandu', '4117503', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 3, -23.4555, -52.046),
  ('Ângulo', '4101150', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 4, -23.1946, -51.9154),
  ('Astorga', '4102109', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 5, -23.2318, -51.6668),
  ('Atalaia', '4102208', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 6, -23.1517, -52.0551),
  ('Cafeara', '4103404', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 7, -22.789, -51.7142),
  ('Centenário do Sul', '4105102', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 8, -22.8188, -51.5973),
  ('Colorado', '4105904', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 9, -22.8374, -51.9743),
  ('Flórida', '4108106', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 10, -23.0847, -51.9546),
  ('Guaraci', '4109203', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 11, -22.9694, -51.6504),
  ('Iguaraçu', '4110003', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 12, -23.1949, -51.8256),
  ('Itaguajé', '4110904', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 13, -22.6183, -51.9674),
  ('Jaguapitã', '4111902', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 14, -23.1104, -51.5342),
  ('Lobato', '4113601', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 15, -23.0058, -51.9524),
  ('Lupionópolis', '4113809', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 16, -22.755, -51.6601),
  ('Mandaguaçu', '4114104', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 17, -23.3458, -52.0944),
  ('Munhoz de Melo', '4116307', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 18, -23.1487, -51.7737),
  ('Nossa Senhora das Graças', '4116406', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 19, -22.9129, -51.7978),
  ('Nova Esperança', '4116901', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 20, -23.182, -52.2031),
  ('Presidente Castelo Branco', '4120408', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 21, -23.2782, -52.1536),
  ('Santa Fé', '4123402', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 22, -23.04, -51.808),
  ('Santa Inês', '4123600', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 23, -22.6376, -51.9024),
  ('Santo Inácio', '4124509', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 24, -22.6957, -51.7969),
  ('Uniflor', '4128302', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 25, -23.0868, -52.1573),
  ('Doutor Camargo', '4107306', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 26, -23.5582, -52.2178),
  ('Floraí', '4107801', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 27, -23.3178, -52.3029),
  ('Floresta', '4107900', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 28, -23.6031, -52.0807),
  ('Itambé', '4111100', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 29, -23.6601, -51.9912),
  ('Ivatuba', '4111605', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 30, -23.6187, -52.2203),
  ('Ourizona', '4117404', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 31, -23.4053, -52.1964),
  ('São Jorge do Ivaí', '4125308', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 32, -23.4336, -52.2929),
  ('Araruna', '4101705', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 33, -23.9315, -52.5021),
  ('Barbosa Ferraz', '4102505', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 34, -24.0334, -52.004),
  ('Campo Mourão', '4104303', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 35, -24.0463, -52.378),
  ('Corumbataí do Sul', '4106555', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 36, -24.101, -52.1177),
  ('Engenheiro Beltrão', '4107504', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 37, -23.797, -52.2659),
  ('Farol', '4107553', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 38, -24.0958, -52.6217),
  ('Fênix', '4107702', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 39, -23.9135, -51.9805),
  ('Iretama', '4110805', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 40, -24.4253, -52.1012),
  ('Luiziana', '4113734', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 41, -24.2853, -52.269),
  ('Mamborê', '4114005', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 42, -24.317, -52.5271),
  ('Peabiru', '4118808', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 43, -23.914, -52.3431),
  ('Quinta do Sol', '4121109', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 44, -23.8533, -52.1309),
  ('Roncador', '4122503', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 45, -24.5958, -52.2716),
  ('Terra Boa', '4127205', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 46, -23.7683, -52.447),
  ('Alto Paraná', '4100608', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 47, -23.1312, -52.3189),
  ('Amaporã', '4100905', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 48, -23.0943, -52.7866),
  ('Cruzeiro do Sul', '4106704', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 49, -22.9624, -52.1622),
  ('Diamante do Norte', '4107108', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 50, -22.655, -52.8617),
  ('Guairaçá', '4108908', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 51, -22.932, -52.6906),
  ('Inajá', '4110300', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 52, -22.7509, -52.1995),
  ('Itaúna do Sul', '4111308', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 53, -22.7289, -52.8874),
  ('Jardim Olinda', '4112603', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 54, -22.5523, -52.0503),
  ('Loanda', '4113502', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 55, -22.9232, -53.1362),
  ('Marilena', '4115002', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 56, -22.7336, -53.0402),
  ('Mirador', '4115903', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 57, -23.255, -52.7761),
  ('Nova Aliança do Ivaí', '4116505', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 58, -23.1763, -52.6032),
  ('Nova Londrina', '4117107', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 59, -22.7639, -52.9868),
  ('Paraíso do Norte', '4118006', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 60, -23.2824, -52.6054),
  ('Paranacity', '4118105', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 61, -22.9297, -52.1549),
  ('Paranapoema', '4118303', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 62, -22.6412, -52.0905),
  ('Paranavaí', '4118402', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 63, -23.0816, -52.4617),
  ('Planaltina do Paraná', '4119707', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 64, -23.0101, -52.9162),
  ('Porto Rico', '4120200', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 65, -22.7747, -53.2677),
  ('Querência do Norte', '4121000', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 66, -23.0838, -53.483),
  ('Santa Cruz de Monte Castelo', '4123303', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 67, -22.9582, -53.2949),
  ('Santa Isabel do Ivaí', '4123709', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 68, -23.0025, -53.1989),
  ('Santa Mônica', '4123956', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 69, -23.108, -53.1103),
  ('Santo Antônio do Caiuá', '4124202', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 70, -22.7351, -52.344),
  ('São Carlos do Ivaí', '4124608', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 71, -23.3158, -52.4761),
  ('São João do Caiuá', '4124905', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 72, -22.8535, -52.3411),
  ('São Pedro do Paraná', '4125902', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 73, -22.8239, -53.2241),
  ('Tamboara', '4126702', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 74, -23.2036, -52.4743),
  ('Terra Rica', '4127304', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Maringá' AND is_hub LIMIT 1), 75, -22.7111, -52.6188),
  ('Califórnia', '4103503', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 1, -23.6566, -51.3574),
  ('Cambira', '4103800', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 2, -23.5892, -51.5792),
  ('Jandaia do Sul', '4112108', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 3, -23.6011, -51.6448),
  ('Marilândia do Sul', '4114906', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 4, -23.7425, -51.3137),
  ('Mauá da Serra', '4115754', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 5, -23.8988, -51.2277),
  ('Novo Itacolomi', '4117297', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 6, -23.7631, -51.5079),
  ('Sabáudia', '4122701', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 7, -23.3155, -51.555),
  ('Bom Sucesso', '4103206', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 8, -23.7063, -51.7671),
  ('Borrazópolis', '4103305', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 9, -23.9366, -51.5875),
  ('Cruzmaltina', '4106852', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 10, -24.0132, -51.4563),
  ('Cruzmaltina', '4106852', false, (SELECT id FROM public.pr_municipios WHERE nome = 'Apucarana' AND is_hub LIMIT 1), 11, -24.0132, -51.4563)
ON CONFLICT DO NOTHING;

-- Restante das cidades satélite será carregado em migration subsequente para respeitar tamanho
-- (Umuarama, Ponta Grossa, Cascavel, Foz do Iguaçu, Toledo, Guarapuava, Apucarana pos 12+)