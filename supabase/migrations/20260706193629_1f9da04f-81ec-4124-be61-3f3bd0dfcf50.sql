
CREATE POLICY req_att_storage_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'requirement-attachments');
CREATE POLICY req_att_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'requirement-attachments');
CREATE POLICY req_att_storage_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'requirement-attachments' AND (owner = auth.uid() OR public.is_staff(auth.uid())));
