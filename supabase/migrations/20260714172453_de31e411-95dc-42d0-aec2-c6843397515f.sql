
CREATE POLICY "Authenticated upload action-evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'action-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated read action-evidence" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'action-evidence');
CREATE POLICY "Authenticated delete own action-evidence" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'action-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
