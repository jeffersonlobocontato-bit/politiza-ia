-- Módulo: Distribuição de Material — suporte a retiradas (além de entregas por rota)
--
-- Curitiba funciona como depósito de origem: em vez de receber material por rota (caminhão
-- percorrendo cidades), pessoas retiram o material diretamente lá. Esta migration diferencia
-- os dois tipos de movimentação na mesma tabela (mesma estrutura de kit já existente), em vez
-- de criar uma tabela nova — mantém o histórico e os relatórios unificados.

ALTER TABLE public.logistica_envios_material
  ADD COLUMN IF NOT EXISTS tipo_movimentacao text NOT NULL DEFAULT 'entrega'
    CHECK (tipo_movimentacao IN ('entrega', 'retirada'));

CREATE INDEX IF NOT EXISTS idx_logistica_envios_tipo_mov ON public.logistica_envios_material (tipo_movimentacao);

COMMENT ON COLUMN public.logistica_envios_material.tipo_movimentacao IS
  'entrega = material levado até a cidade por uma rota; retirada = material retirado pelo responsável direto no depósito (ex.: Curitiba).';
