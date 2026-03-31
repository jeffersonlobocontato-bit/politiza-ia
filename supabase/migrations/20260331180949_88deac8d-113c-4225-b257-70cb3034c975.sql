
-- Create storage bucket for candidate photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-photos', 'candidate-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload candidate photos
CREATE POLICY "Authenticated users can upload candidate photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'candidate-photos');

-- Allow public read access to candidate photos
CREATE POLICY "Public read access to candidate photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'candidate-photos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update candidate photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'candidate-photos');

-- Allow authenticated users to delete candidate photos
CREATE POLICY "Authenticated users can delete candidate photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'candidate-photos');
