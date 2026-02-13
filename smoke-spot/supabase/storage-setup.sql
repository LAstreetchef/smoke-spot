-- Create storage bucket for spot photos
-- Run this in Supabase SQL Editor

-- Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-photos', 'spot-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload spot photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'spot-photos');

-- Allow public to view photos
CREATE POLICY "Anyone can view spot photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'spot-photos');

-- Allow users to delete their own uploads (optional)
CREATE POLICY "Users can delete their own spot photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'spot-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Also ensure users can update spot photos
-- (Add to smoke_spots RLS policies if not exists)
CREATE POLICY "Authenticated users can update spot photos"
ON smoke_spots FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
