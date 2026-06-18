
DROP POLICY IF EXISTS "evento_banners_select" ON storage.objects;
CREATE POLICY "evento_banners_select" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'evento-banners');
