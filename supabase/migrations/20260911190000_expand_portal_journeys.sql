-- Dados mínimos e próprios para os portais, restritos pelo vínculo de identidade.
create or replace function private.get_my_patient_appointments() returns table(appointment_id uuid, scheduled_at timestamptz, status text, reason text, clinic_name text, service_name text) language sql stable security definer set search_path = public, private as $$
  select a.id,a.scheduled_at,a.status,a.reason,c.name,s.name from public.profiles profile join public.patients p on p.person_id=profile.person_id join public.appointments a on a.patient_id=p.id join public.clinics c on c.id=a.clinic_id left join public.clinic_services s on s.id=a.clinic_service_id where profile.id=auth.uid() and p.status='active' and private.has_role_code('patient') order by a.scheduled_at desc limit 30;
$$;
create or replace function public.get_my_patient_appointments() returns table(appointment_id uuid, scheduled_at timestamptz, status text, reason text, clinic_name text, service_name text) language sql security invoker set search_path=public,private as $$ select * from private.get_my_patient_appointments(); $$;
revoke execute on function public.get_my_patient_appointments() from public, anon;
grant execute on function public.get_my_patient_appointments() to authenticated;

create or replace function private.get_my_patient_documents() returns table(document_id uuid, document_type text, file_name text, storage_path text, created_at timestamptz) language sql stable security definer set search_path = public, private as $$
  select d.id,d.document_type,d.file_name,d.storage_path,d.created_at from public.profiles profile join public.patients p on p.person_id=profile.person_id join public.documents d on d.patient_id=p.id where profile.id=auth.uid() and p.status='active' and d.archived_at is null and private.has_role_code('patient') order by d.created_at desc limit 50;
$$;
create or replace function public.get_my_patient_documents() returns table(document_id uuid, document_type text, file_name text, storage_path text, created_at timestamptz) language sql security invoker set search_path=public,private as $$ select * from private.get_my_patient_documents(); $$;
revoke execute on function public.get_my_patient_documents() from public, anon;
grant execute on function public.get_my_patient_documents() to authenticated;

create or replace function private.get_my_tutor_clinical_journey() returns table(animal_id uuid, animal_name text, event_type text, event_date timestamptz, title text, details text) language sql stable security definer set search_path = public, private as $$
  select a.id,a.name,'consulta',v.created_at,coalesce(v.diagnosis,'Consulta veterinária'),v.chief_complaint from public.profiles profile join public.persons person on person.id=profile.person_id join public.animal_guardians g on g.person_id=person.id join public.animals a on a.id=g.animal_id join public.veterinary_consultations v on v.animal_id=a.id where profile.id=auth.uid() and private.has_role_code('tutor') union all select a.id,a.name,'vacina',v.administered_at,coalesce(v.vaccine_name,'Vacinação'),v.veterinarian_notes from public.profiles profile join public.persons person on person.id=profile.person_id join public.animal_guardians g on g.person_id=person.id join public.animals a on a.id=g.animal_id join public.veterinary_vaccinations v on v.animal_id=a.id where profile.id=auth.uid() and private.has_role_code('tutor') order by 4 desc limit 50;
$$;
create or replace function public.get_my_tutor_clinical_journey() returns table(animal_id uuid, animal_name text, event_type text, event_date timestamptz, title text, details text) language sql security invoker set search_path=public,private as $$ select * from private.get_my_tutor_clinical_journey(); $$;
revoke execute on function public.get_my_tutor_clinical_journey() from public, anon;
grant execute on function public.get_my_tutor_clinical_journey() to authenticated;
