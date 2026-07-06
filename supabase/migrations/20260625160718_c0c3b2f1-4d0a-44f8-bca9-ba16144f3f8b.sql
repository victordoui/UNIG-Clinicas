
CREATE POLICY "demand-attachments read auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'demand-attachments');

CREATE POLICY "demand-attachments insert auth"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'demand-attachments');

CREATE POLICY "demand-attachments delete owner"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'demand-attachments' AND owner = auth.uid());
