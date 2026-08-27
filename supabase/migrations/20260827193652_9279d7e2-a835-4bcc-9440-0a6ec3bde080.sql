ALTER TABLE public.logistica_envios_material
  ADD COLUMN IF NOT EXISTS entregue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS entregue_em timestamptz,
  ADD COLUMN IF NOT EXISTS entregue_por uuid,
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS entrega_obs text;

CREATE INDEX IF NOT EXISTS idx_logistica_envios_entregue ON public.logistica_envios_material (entregue);