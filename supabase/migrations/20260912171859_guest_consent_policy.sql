-- Acesso administrativo mínimo aos consentimentos de entrada na fila.
-- A tabela continua sem grants diretos para anon/authenticated; a policy evita
-- uma tabela RLS sem regra e protege qualquer grant futuro acidental.

create policy patient_data_consents_manage
  on public.patient_data_consents
  for select to authenticated
  using (private.has_patient_permission(organization_id, patient_id, 'patient.manage'));
