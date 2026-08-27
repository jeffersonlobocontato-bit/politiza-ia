CREATE POLICY "logistica_entregas_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'logistica-entregas');

CREATE POLICY "logistica_entregas_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logistica-entregas' AND public.is_logistica_gestor(auth.uid()));

CREATE POLICY "logistica_entregas_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'logistica-entregas' AND public.is_logistica_gestor(auth.uid()))
WITH CHECK (bucket_id = 'logistica-entregas' AND public.is_logistica_gestor(auth.uid()));

CREATE POLICY "logistica_entregas_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'logistica-entregas' AND public.is_logistica_gestor(auth.uid()));