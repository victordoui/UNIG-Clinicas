-- As respostas continuam sem grants diretos; esta policy protege qualquer
-- concessão futura e permite auditoria estritamente para gestão autorizada.

create policy appointment_feedback_manage
  on public.appointment_feedback
  for select to authenticated
  using (private.has_clinic_permission(organization_id, clinic_id, 'clinic.manage'));

create policy veterinary_consultation_feedback_manage
  on public.veterinary_consultation_feedback
  for select to authenticated
  using (private.has_clinic_permission(organization_id, clinic_id, 'clinic.manage'));
