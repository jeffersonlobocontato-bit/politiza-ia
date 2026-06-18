ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS banner_aspect_ratio text NOT NULL DEFAULT '16/9',
  ADD COLUMN IF NOT EXISTS banner_position_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS banner_position_y numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS banner_zoom numeric NOT NULL DEFAULT 1;

DROP VIEW IF EXISTS public.eventos_com_contagem;
CREATE VIEW public.eventos_com_contagem AS
SELECT
  e.*,
  COALESCE((SELECT COUNT(*) FROM public.inscricoes i WHERE i.evento_id = e.id), 0) AS total_inscritos,
  COALESCE((SELECT COUNT(*) FROM public.inscricoes i WHERE i.evento_id = e.id AND i.status = 'presente'), 0) AS total_presentes
FROM public.eventos e;

GRANT SELECT ON public.eventos_com_contagem TO authenticated;
GRANT SELECT ON public.eventos_com_contagem TO anon;