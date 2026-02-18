-- Allow users to delete their own avatar files
CREATE POLICY "Users delete own avatar"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
