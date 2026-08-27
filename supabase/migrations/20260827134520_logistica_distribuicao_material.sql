-- Módulo: Distribuição de Material de Campo
-- Cadastro de envios de material por município, responsáveis pela retirada/recebimento,
-- levantamento de domicílios estimados por município e dashboard de cobertura.

-- 1) Função de permissão dedicada (gestores de logística + coordenação)
CREATE OR REPLACE FUNCTION public.is_logistica_gestor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_master', 'coordenador_estadual', 'coordenador_regional',
                    'coordenador_municipal', 'gestor_operacional', 'operador_campo')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_logistica_gestor(uuid) FROM PUBLIC, anon;

-- 2) Levantamento de domicílios estimados por município (referência para cruzamento de cobertura)
CREATE TABLE IF NOT EXISTS public.logistica_domicilios_municipio (
  codigo_ibge text PRIMARY KEY,
  municipio text NOT NULL,
  macroregion_id text REFERENCES public.macroregions(id),
  populacao_estimada integer,
  domicilios_estimado integer,
  fonte text NOT NULL DEFAULT 'pendente',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_logistica_domicilios_macro ON public.logistica_domicilios_municipio(macroregion_id);
CREATE INDEX IF NOT EXISTS idx_logistica_domicilios_municipio ON public.logistica_domicilios_municipio(municipio);

GRANT SELECT ON public.logistica_domicilios_municipio TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.logistica_domicilios_municipio TO authenticated;
GRANT ALL ON public.logistica_domicilios_municipio TO service_role;

ALTER TABLE public.logistica_domicilios_municipio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistica_domicilios_select" ON public.logistica_domicilios_municipio;
CREATE POLICY "logistica_domicilios_select" ON public.logistica_domicilios_municipio
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "logistica_domicilios_write" ON public.logistica_domicilios_municipio;
CREATE POLICY "logistica_domicilios_write" ON public.logistica_domicilios_municipio
  FOR ALL TO authenticated
  USING (public.is_logistica_gestor(auth.uid()))
  WITH CHECK (public.is_logistica_gestor(auth.uid()));

DROP TRIGGER IF EXISTS trg_logistica_domicilios_upd ON public.logistica_domicilios_municipio;
CREATE TRIGGER trg_logistica_domicilios_upd BEFORE UPDATE ON public.logistica_domicilios_municipio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Responsáveis pela retirada/recebimento de material
CREATE TABLE IF NOT EXISTS public.logistica_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  tag_tipo text NOT NULL DEFAULT 'cidade' CHECK (tag_tipo IN ('cidade', 'regiao')),
  municipio text,
  macroregion_id text REFERENCES public.macroregions(id),
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT logistica_responsaveis_tag_check CHECK (
    (tag_tipo = 'cidade' AND municipio IS NOT NULL) OR
    (tag_tipo = 'regiao' AND macroregion_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_logistica_responsaveis_nome ON public.logistica_responsaveis (lower(nome));
CREATE INDEX IF NOT EXISTS idx_logistica_responsaveis_municipio ON public.logistica_responsaveis (municipio);
CREATE INDEX IF NOT EXISTS idx_logistica_responsaveis_macro ON public.logistica_responsaveis (macroregion_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistica_responsaveis TO authenticated;
GRANT ALL ON public.logistica_responsaveis TO service_role;

ALTER TABLE public.logistica_responsaveis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistica_responsaveis_select" ON public.logistica_responsaveis;
CREATE POLICY "logistica_responsaveis_select" ON public.logistica_responsaveis
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "logistica_responsaveis_write" ON public.logistica_responsaveis;
CREATE POLICY "logistica_responsaveis_write" ON public.logistica_responsaveis
  FOR ALL TO authenticated
  USING (public.is_logistica_gestor(auth.uid()))
  WITH CHECK (public.is_logistica_gestor(auth.uid()));

DROP TRIGGER IF EXISTS trg_logistica_responsaveis_upd ON public.logistica_responsaveis;
CREATE TRIGGER trg_logistica_responsaveis_upd BEFORE UPDATE ON public.logistica_responsaveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Envios de material por município
CREATE TABLE IF NOT EXISTS public.logistica_envios_material (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio text NOT NULL,
  codigo_ibge text,
  macroregion_id text REFERENCES public.macroregions(id),
  tipo_material text NOT NULL DEFAULT 'Material gráfico',
  quantidade integer NOT NULL CHECK (quantidade > 0),
  responsavel_id uuid REFERENCES public.logistica_responsaveis(id) ON DELETE SET NULL,
  data_envio date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_logistica_envios_municipio ON public.logistica_envios_material (municipio);
CREATE INDEX IF NOT EXISTS idx_logistica_envios_macro ON public.logistica_envios_material (macroregion_id);
CREATE INDEX IF NOT EXISTS idx_logistica_envios_responsavel ON public.logistica_envios_material (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_logistica_envios_data ON public.logistica_envios_material (data_envio);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistica_envios_material TO authenticated;
GRANT ALL ON public.logistica_envios_material TO service_role;

ALTER TABLE public.logistica_envios_material ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistica_envios_select" ON public.logistica_envios_material;
CREATE POLICY "logistica_envios_select" ON public.logistica_envios_material
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "logistica_envios_write" ON public.logistica_envios_material;
CREATE POLICY "logistica_envios_write" ON public.logistica_envios_material
  FOR ALL TO authenticated
  USING (public.is_logistica_gestor(auth.uid()))
  WITH CHECK (public.is_logistica_gestor(auth.uid()));

DROP TRIGGER IF EXISTS trg_logistica_envios_upd ON public.logistica_envios_material;
CREATE TRIGGER trg_logistica_envios_upd BEFORE UPDATE ON public.logistica_envios_material
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Carga inicial — levantamento de domicílios dos 399 municípios do Paraná
-- Para as 19 cidades com população já cadastrada em public.municipalities, o número de
-- domicílios é estimado dividindo a população pela média de moradores/domicílio do PR (2,85 — IBGE).
-- As demais entram como 'pendente' — o gestor de logística preenche/ajusta pela tela de cadastro.
INSERT INTO public.logistica_domicilios_municipio
  (codigo_ibge, municipio, macroregion_id, populacao_estimada, domicilios_estimado, fonte)
VALUES
  ('4100103', 'Abatiá', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4100202', 'Adrianópolis', 'rmc', NULL, NULL, 'pendente'),
  ('4100301', 'Agudos do Sul', 'rmc', NULL, NULL, 'pendente'),
  ('4100400', 'Almirante Tamandaré', 'rmc', NULL, NULL, 'pendente'),
  ('4100459', 'Altamira do Paraná', 'norte_central', NULL, NULL, 'pendente'),
  ('4100608', 'Alto Paraná', 'noroeste', NULL, NULL, 'pendente'),
  ('4128625', 'Alto Paraíso', 'noroeste', NULL, NULL, 'pendente'),
  ('4100707', 'Alto Piquiri', 'noroeste', NULL, NULL, 'pendente'),
  ('4100509', 'Altônia', 'noroeste', NULL, NULL, 'pendente'),
  ('4100806', 'Alvorada do Sul', 'norte_central', NULL, NULL, 'pendente'),
  ('4100905', 'Amaporã', 'noroeste', NULL, NULL, 'pendente'),
  ('4101002', 'Ampére', 'sudoeste', NULL, NULL, 'pendente'),
  ('4101051', 'Anahy', 'oeste', NULL, NULL, 'pendente'),
  ('4101101', 'Andirá', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4101200', 'Antonina', 'rmc', NULL, NULL, 'pendente'),
  ('4101309', 'Antônio Olinto', 'centro_sul', NULL, NULL, 'pendente'),
  ('4101408', 'Apucarana', 'norte_central', 134891, 47330, 'ibge_estimativa'),
  ('4101507', 'Arapongas', 'norte_central', NULL, NULL, 'pendente'),
  ('4101606', 'Arapoti', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4101655', 'Arapuã', 'norte_central', NULL, NULL, 'pendente'),
  ('4101705', 'Araruna', 'norte_central', NULL, NULL, 'pendente'),
  ('4101804', 'Araucária', 'rmc', NULL, NULL, 'pendente'),
  ('4101853', 'Ariranha do Ivaí', 'norte_central', NULL, NULL, 'pendente'),
  ('4101903', 'Assaí', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4102000', 'Assis Chateaubriand', 'oeste', NULL, NULL, 'pendente'),
  ('4102109', 'Astorga', 'norte_central', NULL, NULL, 'pendente'),
  ('4102208', 'Atalaia', 'norte_central', NULL, NULL, 'pendente'),
  ('4102307', 'Balsa Nova', 'rmc', NULL, NULL, 'pendente'),
  ('4102406', 'Bandeirantes', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4102505', 'Barbosa Ferraz', 'norte_central', NULL, NULL, 'pendente'),
  ('4102703', 'Barra do Jacaré', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4102604', 'Barracão', 'sudoeste', NULL, NULL, 'pendente'),
  ('4102752', 'Bela Vista da Caroba', 'sudoeste', NULL, NULL, 'pendente'),
  ('4102802', 'Bela Vista do Paraíso', 'norte_central', NULL, NULL, 'pendente'),
  ('4102901', 'Bituruna', 'centro_sul', NULL, NULL, 'pendente'),
  ('4103008', 'Boa Esperança', 'norte_central', NULL, NULL, 'pendente'),
  ('4103024', 'Boa Esperança do Iguaçu', 'sudoeste', NULL, NULL, 'pendente'),
  ('4103040', 'Boa Ventura de São Roque', 'centro_sul', NULL, NULL, 'pendente'),
  ('4103057', 'Boa Vista da Aparecida', 'oeste', NULL, NULL, 'pendente'),
  ('4103107', 'Bocaiúva do Sul', 'rmc', NULL, NULL, 'pendente'),
  ('4103156', 'Bom Jesus do Sul', 'sudoeste', NULL, NULL, 'pendente'),
  ('4103206', 'Bom Sucesso', 'norte_central', NULL, NULL, 'pendente'),
  ('4103222', 'Bom Sucesso do Sul', 'sudoeste', NULL, NULL, 'pendente'),
  ('4103305', 'Borrazópolis', 'norte_central', NULL, NULL, 'pendente'),
  ('4103354', 'Braganey', 'oeste', NULL, NULL, 'pendente'),
  ('4103370', 'Brasilândia do Sul', 'noroeste', NULL, NULL, 'pendente'),
  ('4103404', 'Cafeara', 'norte_central', NULL, NULL, 'pendente'),
  ('4103453', 'Cafelândia', 'oeste', NULL, NULL, 'pendente'),
  ('4103479', 'Cafezal do Sul', 'noroeste', NULL, NULL, 'pendente'),
  ('4103503', 'Califórnia', 'norte_central', NULL, NULL, 'pendente'),
  ('4103602', 'Cambará', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4103800', 'Cambira', 'norte_central', NULL, NULL, 'pendente'),
  ('4103701', 'Cambé', 'norte_central', NULL, NULL, 'pendente'),
  ('4104006', 'Campina Grande do Sul', 'rmc', NULL, NULL, 'pendente'),
  ('4103909', 'Campina da Lagoa', 'norte_central', NULL, NULL, 'pendente'),
  ('4103958', 'Campina do Simão', 'centro_sul', NULL, NULL, 'pendente'),
  ('4104055', 'Campo Bonito', 'oeste', NULL, NULL, 'pendente'),
  ('4104204', 'Campo Largo', 'rmc', NULL, NULL, 'pendente'),
  ('4104253', 'Campo Magro', 'rmc', NULL, NULL, 'pendente'),
  ('4104303', 'Campo Mourão', 'norte_central', 94622, 33201, 'ibge_estimativa'),
  ('4104105', 'Campo do Tenente', 'rmc', NULL, NULL, 'pendente'),
  ('4104428', 'Candói', 'centro_sul', NULL, NULL, 'pendente'),
  ('4104451', 'Cantagalo', 'centro_sul', NULL, NULL, 'pendente'),
  ('4104501', 'Capanema', 'sudoeste', NULL, NULL, 'pendente'),
  ('4104600', 'Capitão Leônidas Marques', 'oeste', NULL, NULL, 'pendente'),
  ('4104659', 'Carambeí', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4104709', 'Carlópolis', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4104808', 'Cascavel', 'oeste', 345249, 121140, 'ibge_estimativa'),
  ('4104907', 'Castro', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4105003', 'Catanduvas', 'oeste', NULL, NULL, 'pendente'),
  ('4105102', 'Centenário do Sul', 'norte_central', NULL, NULL, 'pendente'),
  ('4105201', 'Cerro Azul', 'rmc', NULL, NULL, 'pendente'),
  ('4105409', 'Chopinzinho', 'sudoeste', NULL, NULL, 'pendente'),
  ('4105508', 'Cianorte', 'noroeste', NULL, NULL, 'pendente'),
  ('4105607', 'Cidade Gaúcha', 'noroeste', NULL, NULL, 'pendente'),
  ('4105706', 'Clevelândia', 'centro_sul', NULL, NULL, 'pendente'),
  ('4105805', 'Colombo', 'rmc', 261899, 91894, 'ibge_estimativa'),
  ('4105904', 'Colorado', 'norte_central', NULL, NULL, 'pendente'),
  ('4106001', 'Congonhinhas', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4106100', 'Conselheiro Mairinck', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4106209', 'Contenda', 'rmc', NULL, NULL, 'pendente'),
  ('4106308', 'Corbélia', 'oeste', NULL, NULL, 'pendente'),
  ('4106407', 'Cornélio Procópio', 'norte_pioneiro', 48025, 16851, 'ibge_estimativa'),
  ('4106456', 'Coronel Domingos Soares', 'centro_sul', NULL, NULL, 'pendente'),
  ('4106506', 'Coronel Vivida', 'sudoeste', NULL, NULL, 'pendente'),
  ('4106555', 'Corumbataí do Sul', 'norte_central', NULL, NULL, 'pendente'),
  ('4106803', 'Cruz Machado', 'centro_sul', NULL, NULL, 'pendente'),
  ('4106571', 'Cruzeiro do Iguaçu', 'sudoeste', NULL, NULL, 'pendente'),
  ('4106605', 'Cruzeiro do Oeste', 'noroeste', NULL, NULL, 'pendente'),
  ('4106704', 'Cruzeiro do Sul', 'noroeste', NULL, NULL, 'pendente'),
  ('4106852', 'Cruzmaltina', 'norte_central', NULL, NULL, 'pendente'),
  ('4106902', 'Curitiba', 'curitiba', 1963726, 689027, 'ibge_estimativa'),
  ('4107009', 'Curiúva', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4104402', 'Cândido de Abreu', 'norte_central', NULL, NULL, 'pendente'),
  ('4105300', 'Céu Azul', 'oeste', NULL, NULL, 'pendente'),
  ('4107157', 'Diamante D\''Oeste', 'oeste', NULL, NULL, 'pendente'),
  ('4107108', 'Diamante do Norte', 'noroeste', NULL, NULL, 'pendente'),
  ('4107124', 'Diamante do Sul', 'oeste', NULL, NULL, 'pendente'),
  ('4107207', 'Dois Vizinhos', 'sudoeste', NULL, NULL, 'pendente'),
  ('4107256', 'Douradina', 'noroeste', NULL, NULL, 'pendente'),
  ('4107306', 'Doutor Camargo', 'norte_central', NULL, NULL, 'pendente'),
  ('4128633', 'Doutor Ulysses', 'rmc', NULL, NULL, 'pendente'),
  ('4107504', 'Engenheiro Beltrão', 'norte_central', NULL, NULL, 'pendente'),
  ('4107538', 'Entre Rios do Oeste', 'oeste', NULL, NULL, 'pendente'),
  ('4107405', 'Enéas Marques', 'sudoeste', NULL, NULL, 'pendente'),
  ('4107520', 'Esperança Nova', 'noroeste', NULL, NULL, 'pendente'),
  ('4107546', 'Espigão Alto do Iguaçu', 'centro_sul', NULL, NULL, 'pendente'),
  ('4107553', 'Farol', 'norte_central', NULL, NULL, 'pendente'),
  ('4107603', 'Faxinal', 'norte_central', NULL, NULL, 'pendente'),
  ('4107652', 'Fazenda Rio Grande', 'rmc', NULL, NULL, 'pendente'),
  ('4107736', 'Fernandes Pinheiro', 'centro_sul', NULL, NULL, 'pendente'),
  ('4107751', 'Figueira', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4107850', 'Flor da Serra do Sul', 'sudoeste', NULL, NULL, 'pendente'),
  ('4107801', 'Floraí', 'norte_central', NULL, NULL, 'pendente'),
  ('4107900', 'Floresta', 'norte_central', NULL, NULL, 'pendente'),
  ('4108007', 'Florestópolis', 'norte_central', NULL, NULL, 'pendente'),
  ('4108106', 'Flórida', 'norte_central', NULL, NULL, 'pendente'),
  ('4108205', 'Formosa do Oeste', 'oeste', NULL, NULL, 'pendente'),
  ('4108304', 'Foz do Iguaçu', 'oeste', 260348, 91350, 'ibge_estimativa'),
  ('4108452', 'Foz do Jordão', 'centro_sul', NULL, NULL, 'pendente'),
  ('4108320', 'Francisco Alves', 'noroeste', NULL, NULL, 'pendente'),
  ('4108403', 'Francisco Beltrão', 'sudoeste', 92951, 32614, 'ibge_estimativa'),
  ('4107702', 'Fênix', 'norte_central', NULL, NULL, 'pendente'),
  ('4108502', 'General Carneiro', 'centro_sul', NULL, NULL, 'pendente'),
  ('4108551', 'Godoy Moreira', 'norte_central', NULL, NULL, 'pendente'),
  ('4108601', 'Goioerê', 'norte_central', NULL, NULL, 'pendente'),
  ('4108650', 'Goioxim', 'centro_sul', NULL, NULL, 'pendente'),
  ('4108700', 'Grandes Rios', 'norte_central', NULL, NULL, 'pendente'),
  ('4108908', 'Guairaçá', 'noroeste', NULL, NULL, 'pendente'),
  ('4108957', 'Guamiranga', 'centro_sul', NULL, NULL, 'pendente'),
  ('4109005', 'Guapirama', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4109104', 'Guaporema', 'noroeste', NULL, NULL, 'pendente'),
  ('4109203', 'Guaraci', 'norte_central', NULL, NULL, 'pendente'),
  ('4109302', 'Guaraniaçu', 'oeste', NULL, NULL, 'pendente'),
  ('4109401', 'Guarapuava', 'centro_sul', 186185, 65328, 'ibge_estimativa'),
  ('4109500', 'Guaraqueçaba', 'rmc', NULL, NULL, 'pendente'),
  ('4109609', 'Guaratuba', 'rmc', NULL, NULL, 'pendente'),
  ('4108809', 'Guaíra', 'oeste', NULL, NULL, 'pendente'),
  ('4109658', 'Honório Serpa', 'centro_sul', NULL, NULL, 'pendente'),
  ('4109708', 'Ibaiti', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4109757', 'Ibema', 'oeste', NULL, NULL, 'pendente'),
  ('4109807', 'Ibiporã', 'norte_central', NULL, NULL, 'pendente'),
  ('4109906', 'Icaraíma', 'noroeste', NULL, NULL, 'pendente'),
  ('4110003', 'Iguaraçu', 'norte_central', NULL, NULL, 'pendente'),
  ('4110052', 'Iguatu', 'oeste', NULL, NULL, 'pendente'),
  ('4110078', 'Imbaú', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4110102', 'Imbituva', 'centro_sul', NULL, NULL, 'pendente'),
  ('4110300', 'Inajá', 'noroeste', NULL, NULL, 'pendente'),
  ('4110409', 'Indianópolis', 'noroeste', NULL, NULL, 'pendente'),
  ('4110201', 'Inácio Martins', 'centro_sul', NULL, NULL, 'pendente'),
  ('4110508', 'Ipiranga', 'centro_sul', NULL, NULL, 'pendente'),
  ('4110607', 'Iporã', 'noroeste', NULL, NULL, 'pendente'),
  ('4110656', 'Iracema do Oeste', 'oeste', NULL, NULL, 'pendente'),
  ('4110706', 'Irati', 'centro_sul', 60282, 21152, 'ibge_estimativa'),
  ('4110805', 'Iretama', 'norte_central', NULL, NULL, 'pendente'),
  ('4110904', 'Itaguajé', 'norte_central', NULL, NULL, 'pendente'),
  ('4110953', 'Itaipulândia', 'oeste', NULL, NULL, 'pendente'),
  ('4111001', 'Itambaracá', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4111100', 'Itambé', 'norte_central', NULL, NULL, 'pendente'),
  ('4111209', 'Itapejara d\''Oeste', 'sudoeste', NULL, NULL, 'pendente'),
  ('4111258', 'Itaperuçu', 'rmc', NULL, NULL, 'pendente'),
  ('4111308', 'Itaúna do Sul', 'noroeste', NULL, NULL, 'pendente'),
  ('4111506', 'Ivaiporã', 'norte_central', NULL, NULL, 'pendente'),
  ('4111605', 'Ivatuba', 'norte_central', NULL, NULL, 'pendente'),
  ('4111555', 'Ivaté', 'noroeste', NULL, NULL, 'pendente'),
  ('4111407', 'Ivaí', 'centro_sul', NULL, NULL, 'pendente'),
  ('4111704', 'Jaboti', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4111803', 'Jacarezinho', 'norte_pioneiro', 40694, 14279, 'ibge_estimativa'),
  ('4111902', 'Jaguapitã', 'norte_central', NULL, NULL, 'pendente'),
  ('4112009', 'Jaguariaíva', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4112108', 'Jandaia do Sul', 'norte_central', NULL, NULL, 'pendente'),
  ('4112207', 'Janiópolis', 'norte_central', NULL, NULL, 'pendente'),
  ('4112306', 'Japira', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4112405', 'Japurá', 'noroeste', NULL, NULL, 'pendente'),
  ('4112504', 'Jardim Alegre', 'norte_central', NULL, NULL, 'pendente'),
  ('4112603', 'Jardim Olinda', 'noroeste', NULL, NULL, 'pendente'),
  ('4112702', 'Jataizinho', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4112751', 'Jesuítas', 'oeste', NULL, NULL, 'pendente'),
  ('4112801', 'Joaquim Távora', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4112900', 'Jundiaí do Sul', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4112959', 'Juranda', 'norte_central', NULL, NULL, 'pendente'),
  ('4113007', 'Jussara', 'noroeste', NULL, NULL, 'pendente'),
  ('4113106', 'Kaloré', 'norte_central', NULL, NULL, 'pendente'),
  ('4113205', 'Lapa', 'rmc', NULL, NULL, 'pendente'),
  ('4113254', 'Laranjal', 'centro_sul', NULL, NULL, 'pendente'),
  ('4113304', 'Laranjeiras do Sul', 'centro_sul', NULL, NULL, 'pendente'),
  ('4113403', 'Leópolis', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4113429', 'Lidianópolis', 'norte_central', NULL, NULL, 'pendente'),
  ('4113452', 'Lindoeste', 'oeste', NULL, NULL, 'pendente'),
  ('4113502', 'Loanda', 'noroeste', NULL, NULL, 'pendente'),
  ('4113601', 'Lobato', 'norte_central', NULL, NULL, 'pendente'),
  ('4113700', 'Londrina', 'norte_central', 575482, 201924, 'ibge_estimativa'),
  ('4113734', 'Luiziana', 'norte_central', NULL, NULL, 'pendente'),
  ('4113759', 'Lunardelli', 'norte_central', NULL, NULL, 'pendente'),
  ('4113809', 'Lupionópolis', 'norte_central', NULL, NULL, 'pendente'),
  ('4113908', 'Mallet', 'centro_sul', NULL, NULL, 'pendente'),
  ('4114005', 'Mamborê', 'norte_central', NULL, NULL, 'pendente'),
  ('4114203', 'Mandaguari', 'norte_central', NULL, NULL, 'pendente'),
  ('4114104', 'Mandaguaçu', 'norte_central', NULL, NULL, 'pendente'),
  ('4114302', 'Mandirituba', 'rmc', NULL, NULL, 'pendente'),
  ('4114351', 'Manfrinópolis', 'sudoeste', NULL, NULL, 'pendente'),
  ('4114401', 'Mangueirinha', 'centro_sul', NULL, NULL, 'pendente'),
  ('4114500', 'Manoel Ribas', 'norte_central', NULL, NULL, 'pendente'),
  ('4114609', 'Marechal Cândido Rondon', 'oeste', NULL, NULL, 'pendente'),
  ('4114708', 'Maria Helena', 'noroeste', NULL, NULL, 'pendente'),
  ('4114807', 'Marialva', 'norte_central', NULL, NULL, 'pendente'),
  ('4115002', 'Marilena', 'noroeste', NULL, NULL, 'pendente'),
  ('4115101', 'Mariluz', 'noroeste', NULL, NULL, 'pendente'),
  ('4114906', 'Marilândia do Sul', 'norte_central', NULL, NULL, 'pendente'),
  ('4115200', 'Maringá', 'norte_central', 436472, 153148, 'ibge_estimativa'),
  ('4115358', 'Maripá', 'oeste', NULL, NULL, 'pendente'),
  ('4115309', 'Mariópolis', 'sudoeste', NULL, NULL, 'pendente'),
  ('4115408', 'Marmeleiro', 'sudoeste', NULL, NULL, 'pendente'),
  ('4115457', 'Marquinho', 'centro_sul', NULL, NULL, 'pendente'),
  ('4115507', 'Marumbi', 'norte_central', NULL, NULL, 'pendente'),
  ('4115606', 'Matelândia', 'oeste', NULL, NULL, 'pendente'),
  ('4115705', 'Matinhos', 'rmc', NULL, NULL, 'pendente'),
  ('4115739', 'Mato Rico', 'centro_sul', NULL, NULL, 'pendente'),
  ('4115754', 'Mauá da Serra', 'norte_central', NULL, NULL, 'pendente'),
  ('4115804', 'Medianeira', 'oeste', NULL, NULL, 'pendente'),
  ('4115853', 'Mercedes', 'oeste', NULL, NULL, 'pendente'),
  ('4115903', 'Mirador', 'noroeste', NULL, NULL, 'pendente'),
  ('4116000', 'Miraselva', 'norte_central', NULL, NULL, 'pendente'),
  ('4116059', 'Missal', 'oeste', NULL, NULL, 'pendente'),
  ('4116109', 'Moreira Sales', 'norte_central', NULL, NULL, 'pendente'),
  ('4116208', 'Morretes', 'rmc', NULL, NULL, 'pendente'),
  ('4116307', 'Munhoz de Melo', 'norte_central', NULL, NULL, 'pendente'),
  ('4116406', 'Nossa Senhora das Graças', 'norte_central', NULL, NULL, 'pendente'),
  ('4116505', 'Nova Aliança do Ivaí', 'noroeste', NULL, NULL, 'pendente'),
  ('4116604', 'Nova América da Colina', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4116703', 'Nova Aurora', 'oeste', NULL, NULL, 'pendente'),
  ('4116802', 'Nova Cantu', 'norte_central', NULL, NULL, 'pendente'),
  ('4116901', 'Nova Esperança', 'norte_central', NULL, NULL, 'pendente'),
  ('4116950', 'Nova Esperança do Sudoeste', 'sudoeste', NULL, NULL, 'pendente'),
  ('4117008', 'Nova Fátima', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4117057', 'Nova Laranjeiras', 'centro_sul', NULL, NULL, 'pendente'),
  ('4117107', 'Nova Londrina', 'noroeste', NULL, NULL, 'pendente'),
  ('4117206', 'Nova Olímpia', 'noroeste', NULL, NULL, 'pendente'),
  ('4117255', 'Nova Prata do Iguaçu', 'sudoeste', NULL, NULL, 'pendente'),
  ('4117214', 'Nova Santa Bárbara', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4117222', 'Nova Santa Rosa', 'oeste', NULL, NULL, 'pendente'),
  ('4117271', 'Nova Tebas', 'norte_central', NULL, NULL, 'pendente'),
  ('4117297', 'Novo Itacolomi', 'norte_central', NULL, NULL, 'pendente'),
  ('4117305', 'Ortigueira', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4117404', 'Ourizona', 'norte_central', NULL, NULL, 'pendente'),
  ('4117453', 'Ouro Verde do Oeste', 'oeste', NULL, NULL, 'pendente'),
  ('4117503', 'Paiçandu', 'norte_central', NULL, NULL, 'pendente'),
  ('4117602', 'Palmas', 'centro_sul', NULL, NULL, 'pendente'),
  ('4117701', 'Palmeira', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4117800', 'Palmital', 'centro_sul', NULL, NULL, 'pendente'),
  ('4117909', 'Palotina', 'oeste', NULL, NULL, 'pendente'),
  ('4118105', 'Paranacity', 'noroeste', NULL, NULL, 'pendente'),
  ('4118204', 'Paranaguá', 'rmc', 154936, 54364, 'ibge_estimativa'),
  ('4118303', 'Paranapoema', 'noroeste', NULL, NULL, 'pendente'),
  ('4118402', 'Paranavaí', 'noroeste', NULL, NULL, 'pendente'),
  ('4118006', 'Paraíso do Norte', 'noroeste', NULL, NULL, 'pendente'),
  ('4118451', 'Pato Bragado', 'oeste', NULL, NULL, 'pendente'),
  ('4118501', 'Pato Branco', 'sudoeste', 84374, 29605, 'ibge_estimativa'),
  ('4118600', 'Paula Freitas', 'centro_sul', NULL, NULL, 'pendente'),
  ('4118709', 'Paulo Frontin', 'centro_sul', NULL, NULL, 'pendente'),
  ('4118808', 'Peabiru', 'norte_central', NULL, NULL, 'pendente'),
  ('4118857', 'Perobal', 'noroeste', NULL, NULL, 'pendente'),
  ('4119152', 'Pinhais', 'rmc', NULL, NULL, 'pendente'),
  ('4119251', 'Pinhal de São Bento', 'sudoeste', NULL, NULL, 'pendente'),
  ('4119202', 'Pinhalão', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4119301', 'Pinhão', 'centro_sul', NULL, NULL, 'pendente'),
  ('4119509', 'Piraquara', 'rmc', NULL, NULL, 'pendente'),
  ('4119400', 'Piraí do Sul', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4119608', 'Pitanga', 'centro_sul', NULL, NULL, 'pendente'),
  ('4119657', 'Pitangueiras', 'norte_central', NULL, NULL, 'pendente'),
  ('4119103', 'Piên', 'rmc', NULL, NULL, 'pendente'),
  ('4119707', 'Planaltina do Paraná', 'noroeste', NULL, NULL, 'pendente'),
  ('4119806', 'Planalto', 'sudoeste', NULL, NULL, 'pendente'),
  ('4119905', 'Ponta Grossa', 'campos_gerais', 355498, 124736, 'ibge_estimativa'),
  ('4119954', 'Pontal do Paraná', 'rmc', NULL, NULL, 'pendente'),
  ('4120002', 'Porecatu', 'norte_central', NULL, NULL, 'pendente'),
  ('4120101', 'Porto Amazonas', 'rmc', NULL, NULL, 'pendente'),
  ('4120150', 'Porto Barreiro', 'centro_sul', NULL, NULL, 'pendente'),
  ('4120200', 'Porto Rico', 'noroeste', NULL, NULL, 'pendente'),
  ('4120309', 'Porto Vitória', 'centro_sul', NULL, NULL, 'pendente'),
  ('4120333', 'Prado Ferreira', 'norte_central', NULL, NULL, 'pendente'),
  ('4120358', 'Pranchita', 'sudoeste', NULL, NULL, 'pendente'),
  ('4120408', 'Presidente Castelo Branco', 'norte_central', NULL, NULL, 'pendente'),
  ('4120507', 'Primeiro de Maio', 'norte_central', NULL, NULL, 'pendente'),
  ('4120606', 'Prudentópolis', 'centro_sul', NULL, NULL, 'pendente'),
  ('4118907', 'Pérola', 'noroeste', NULL, NULL, 'pendente'),
  ('4119004', 'Pérola d\''Oeste', 'sudoeste', NULL, NULL, 'pendente'),
  ('4120655', 'Quarto Centenário', 'norte_central', NULL, NULL, 'pendente'),
  ('4120705', 'Quatiguá', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4120804', 'Quatro Barras', 'rmc', NULL, NULL, 'pendente'),
  ('4120853', 'Quatro Pontes', 'oeste', NULL, NULL, 'pendente'),
  ('4120903', 'Quedas do Iguaçu', 'centro_sul', NULL, NULL, 'pendente'),
  ('4121000', 'Querência do Norte', 'noroeste', NULL, NULL, 'pendente'),
  ('4121109', 'Quinta do Sol', 'norte_central', NULL, NULL, 'pendente'),
  ('4121208', 'Quitandinha', 'rmc', NULL, NULL, 'pendente'),
  ('4121257', 'Ramilândia', 'oeste', NULL, NULL, 'pendente'),
  ('4121307', 'Rancho Alegre', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4121356', 'Rancho Alegre D\''Oeste', 'norte_central', NULL, NULL, 'pendente'),
  ('4121406', 'Realeza', 'sudoeste', NULL, NULL, 'pendente'),
  ('4121505', 'Rebouças', 'centro_sul', NULL, NULL, 'pendente'),
  ('4121604', 'Renascença', 'sudoeste', NULL, NULL, 'pendente'),
  ('4121703', 'Reserva', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4121752', 'Reserva do Iguaçu', 'centro_sul', NULL, NULL, 'pendente'),
  ('4121802', 'Ribeirão Claro', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4121901', 'Ribeirão do Pinhal', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4122008', 'Rio Azul', 'centro_sul', NULL, NULL, 'pendente'),
  ('4122107', 'Rio Bom', 'norte_central', NULL, NULL, 'pendente'),
  ('4122156', 'Rio Bonito do Iguaçu', 'centro_sul', NULL, NULL, 'pendente'),
  ('4122172', 'Rio Branco do Ivaí', 'norte_central', NULL, NULL, 'pendente'),
  ('4122206', 'Rio Branco do Sul', 'rmc', NULL, NULL, 'pendente'),
  ('4122305', 'Rio Negro', 'rmc', NULL, NULL, 'pendente'),
  ('4122404', 'Rolândia', 'norte_central', NULL, NULL, 'pendente'),
  ('4122503', 'Roncador', 'norte_central', NULL, NULL, 'pendente'),
  ('4122602', 'Rondon', 'noroeste', NULL, NULL, 'pendente'),
  ('4122651', 'Rosário do Ivaí', 'norte_central', NULL, NULL, 'pendente'),
  ('4122701', 'Sabáudia', 'norte_central', NULL, NULL, 'pendente'),
  ('4122800', 'Salgado Filho', 'sudoeste', NULL, NULL, 'pendente'),
  ('4122909', 'Salto do Itararé', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4123006', 'Salto do Lontra', 'sudoeste', NULL, NULL, 'pendente'),
  ('4123105', 'Santa Amélia', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4123204', 'Santa Cecília do Pavão', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4123303', 'Santa Cruz de Monte Castelo', 'noroeste', NULL, NULL, 'pendente'),
  ('4123402', 'Santa Fé', 'norte_central', NULL, NULL, 'pendente'),
  ('4123501', 'Santa Helena', 'oeste', NULL, NULL, 'pendente'),
  ('4123600', 'Santa Inês', 'norte_central', NULL, NULL, 'pendente'),
  ('4123709', 'Santa Isabel do Ivaí', 'noroeste', NULL, NULL, 'pendente'),
  ('4123808', 'Santa Izabel do Oeste', 'sudoeste', NULL, NULL, 'pendente'),
  ('4123824', 'Santa Lúcia', 'oeste', NULL, NULL, 'pendente'),
  ('4123857', 'Santa Maria do Oeste', 'centro_sul', NULL, NULL, 'pendente'),
  ('4123907', 'Santa Mariana', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4123956', 'Santa Mônica', 'noroeste', NULL, NULL, 'pendente'),
  ('4124020', 'Santa Tereza do Oeste', 'oeste', NULL, NULL, 'pendente'),
  ('4124053', 'Santa Terezinha de Itaipu', 'oeste', NULL, NULL, 'pendente'),
  ('4124004', 'Santana do Itararé', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4124103', 'Santo Antônio da Platina', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4124202', 'Santo Antônio do Caiuá', 'noroeste', NULL, NULL, 'pendente'),
  ('4124301', 'Santo Antônio do Paraíso', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4124400', 'Santo Antônio do Sudoeste', 'sudoeste', NULL, NULL, 'pendente'),
  ('4124509', 'Santo Inácio', 'norte_central', NULL, NULL, 'pendente'),
  ('4126207', 'Sapopema', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4126256', 'Sarandi', 'norte_central', NULL, NULL, 'pendente'),
  ('4126272', 'Saudade do Iguaçu', 'sudoeste', NULL, NULL, 'pendente'),
  ('4126306', 'Sengés', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4126355', 'Serranópolis do Iguaçu', 'oeste', NULL, NULL, 'pendente'),
  ('4126405', 'Sertaneja', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4126504', 'Sertanópolis', 'norte_central', NULL, NULL, 'pendente'),
  ('4126603', 'Siqueira Campos', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4126652', 'Sulina', 'sudoeste', NULL, NULL, 'pendente'),
  ('4124608', 'São Carlos do Ivaí', 'noroeste', NULL, NULL, 'pendente'),
  ('4124707', 'São Jerônimo da Serra', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4125209', 'São Jorge d\''Oeste', 'sudoeste', NULL, NULL, 'pendente'),
  ('4125308', 'São Jorge do Ivaí', 'norte_central', NULL, NULL, 'pendente'),
  ('4125357', 'São Jorge do Patrocínio', 'noroeste', NULL, NULL, 'pendente'),
  ('4125407', 'São José da Boa Vista', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4125456', 'São José das Palmeiras', 'oeste', NULL, NULL, 'pendente'),
  ('4125506', 'São José dos Pinhais', 'rmc', 349043, 122471, 'ibge_estimativa'),
  ('4124806', 'São João', 'sudoeste', NULL, NULL, 'pendente'),
  ('4124905', 'São João do Caiuá', 'noroeste', NULL, NULL, 'pendente'),
  ('4125001', 'São João do Ivaí', 'norte_central', NULL, NULL, 'pendente'),
  ('4125100', 'São João do Triunfo', 'centro_sul', NULL, NULL, 'pendente'),
  ('4125555', 'São Manoel do Paraná', 'noroeste', NULL, NULL, 'pendente'),
  ('4125605', 'São Mateus do Sul', 'centro_sul', NULL, NULL, 'pendente'),
  ('4125704', 'São Miguel do Iguaçu', 'oeste', NULL, NULL, 'pendente'),
  ('4125753', 'São Pedro do Iguaçu', 'oeste', NULL, NULL, 'pendente'),
  ('4125803', 'São Pedro do Ivaí', 'norte_central', NULL, NULL, 'pendente'),
  ('4125902', 'São Pedro do Paraná', 'noroeste', NULL, NULL, 'pendente'),
  ('4126009', 'São Sebastião da Amoreira', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4126108', 'São Tomé', 'noroeste', NULL, NULL, 'pendente'),
  ('4126678', 'Tamarana', 'norte_central', NULL, NULL, 'pendente'),
  ('4126702', 'Tamboara', 'noroeste', NULL, NULL, 'pendente'),
  ('4126801', 'Tapejara', 'noroeste', NULL, NULL, 'pendente'),
  ('4126900', 'Tapira', 'noroeste', NULL, NULL, 'pendente'),
  ('4127007', 'Teixeira Soares', 'centro_sul', NULL, NULL, 'pendente'),
  ('4127106', 'Telêmaco Borba', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4127205', 'Terra Boa', 'norte_central', NULL, NULL, 'pendente'),
  ('4127304', 'Terra Rica', 'noroeste', NULL, NULL, 'pendente'),
  ('4127403', 'Terra Roxa', 'oeste', NULL, NULL, 'pendente'),
  ('4127502', 'Tibagi', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4127601', 'Tijucas do Sul', 'rmc', NULL, NULL, 'pendente'),
  ('4127700', 'Toledo', 'oeste', 145371, 51007, 'ibge_estimativa'),
  ('4127809', 'Tomazina', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4127858', 'Três Barras do Paraná', 'oeste', NULL, NULL, 'pendente'),
  ('4127882', 'Tunas do Paraná', 'rmc', NULL, NULL, 'pendente'),
  ('4127908', 'Tuneiras do Oeste', 'noroeste', NULL, NULL, 'pendente'),
  ('4127957', 'Tupãssi', 'oeste', NULL, NULL, 'pendente'),
  ('4127965', 'Turvo', 'centro_sul', NULL, NULL, 'pendente'),
  ('4128005', 'Ubiratã', 'norte_central', NULL, NULL, 'pendente'),
  ('4128104', 'Umuarama', 'noroeste', 113558, 39845, 'ibge_estimativa'),
  ('4128302', 'Uniflor', 'norte_central', NULL, NULL, 'pendente'),
  ('4128203', 'União da Vitória', 'centro_sul', NULL, NULL, 'pendente'),
  ('4128401', 'Uraí', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4128534', 'Ventania', 'campos_gerais', NULL, NULL, 'pendente'),
  ('4128559', 'Vera Cruz do Oeste', 'oeste', NULL, NULL, 'pendente'),
  ('4128609', 'Verê', 'sudoeste', NULL, NULL, 'pendente'),
  ('4128658', 'Virmond', 'centro_sul', NULL, NULL, 'pendente'),
  ('4128708', 'Vitorino', 'sudoeste', NULL, NULL, 'pendente'),
  ('4128500', 'Wenceslau Braz', 'norte_pioneiro', NULL, NULL, 'pendente'),
  ('4128807', 'Xambrê', 'noroeste', NULL, NULL, 'pendente'),
  ('4101150', 'Ângulo', 'norte_central', NULL, NULL, 'pendente')
ON CONFLICT (codigo_ibge) DO NOTHING;
