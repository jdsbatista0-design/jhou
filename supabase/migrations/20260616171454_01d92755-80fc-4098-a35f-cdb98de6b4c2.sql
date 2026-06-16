
CREATE POLICY "Users read own memory attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'memory-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users insert own memory attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memory-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own memory attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'memory-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own memory attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'memory-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
