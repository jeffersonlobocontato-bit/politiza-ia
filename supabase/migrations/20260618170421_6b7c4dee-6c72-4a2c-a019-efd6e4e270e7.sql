
DROP VIEW IF EXISTS public.eventos_com_contagem;
CREATE VIEW public.eventos_com_contagem
WITH (security_invoker = true) AS
SELECT e.*,
  COUNT(i.id) FILTER (WHERE i.status IN ('confirmada','presente')) AS total_inscritos,
  COUNT(i.id) FILTER (WHERE i.status = 'presente') AS total_presentes
FROM public.eventos e
LEFT JOIN public.inscricoes i ON i.evento_id = e.id
GROUP BY e.id;

GRANT SELECT ON public.eventos_com_contagem TO anon, authenticated;

CREATE POLICY "evento_banners_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evento-banners');
CREATE POLICY "evento_banners_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'evento-banners');
CREATE POLICY "evento_banners_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'evento-banners');
