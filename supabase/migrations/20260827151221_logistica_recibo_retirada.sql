-- Módulo: Distribuição de Material — campos do Recibo de Retirada de Material de Campanha
--
-- A retirada em Curitiba segue um recibo físico padronizado ("RECIBO DE RETIRADA DE MATERIAL
-- DE CAMPANHA"), com número de recibo e o nome de quem entregou o material no depósito (além
-- de quem retirou, já coberto por responsavel_id). Esta migration adiciona esses dois campos.

ALTER TABLE public.logistica_envios_material
  ADD COLUMN IF NOT EXISTS recibo_numero text,
  ADD COLUMN IF NOT EXISTS responsavel_entrega text;

CREATE INDEX IF NOT EXISTS idx_logistica_envios_recibo ON public.logistica_envios_material (recibo_numero);

COMMENT ON COLUMN public.logistica_envios_material.recibo_numero IS
  'Número do recibo físico de retirada de material de campanha (preenchido apenas quando tipo_movimentacao = retirada).';
COMMENT ON COLUMN public.logistica_envios_material.responsavel_entrega IS
  'Nome de quem entregou o material no depósito (assinatura "Responsável pela entrega" do recibo) — distinto do responsável cadastrado que retirou.';
