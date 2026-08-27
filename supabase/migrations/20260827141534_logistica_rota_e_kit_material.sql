-- Módulo: Distribuição de Material — suporte a Rota / Nº da Rota e a kit de materiais por entrega
--
-- Motivação (planilha real de logística fornecida pelo usuário): cada entrega física a uma
-- cidade carrega VÁRIOS tipos de material simultaneamente (ex.: perfurados, bolas, praguinhas,
-- bandeiras, colinhas), organizados em rotas numeradas com uma ordem de parada dentro da rota
-- (ex.: Rota 1/azul: São José dos Pinhais → Paranaguá → Guaratuba).
--
-- Em vez de redesenhar a tabela para um modelo header+itens (o que exigiria migrar todo o
-- hook/página já em produção), mantemos uma linha por tipo de material e agrupamos as linhas
-- de uma mesma entrega (mesma cidade, mesmo caminhão, mesmo dia) por um identificador comum
-- (grupo_entrega_id). O formulário passa a enviar N linhas com o mesmo grupo_entrega_id numa
-- única ação de "Registrar entrega".

ALTER TABLE public.logistica_envios_material
  ADD COLUMN IF NOT EXISTS rota integer,
  ADD COLUMN IF NOT EXISTS ordem_rota integer,
  ADD COLUMN IF NOT EXISTS grupo_entrega_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_logistica_envios_grupo_entrega ON public.logistica_envios_material (grupo_entrega_id);
CREATE INDEX IF NOT EXISTS idx_logistica_envios_rota ON public.logistica_envios_material (rota, ordem_rota);

COMMENT ON COLUMN public.logistica_envios_material.rota IS
  'Número da rota de entrega (ex.: 1 = azul, 2 = branca, 3 = amarela). Nulo quando o envio não faz parte de uma rota organizada.';
COMMENT ON COLUMN public.logistica_envios_material.ordem_rota IS
  'Posição da cidade dentro da rota (1ª parada, 2ª parada, ...).';
COMMENT ON COLUMN public.logistica_envios_material.grupo_entrega_id IS
  'Agrupa as várias linhas de material (kit) que pertencem à mesma entrega física — mesma cidade, mesmo dia, mesmo responsável.';
