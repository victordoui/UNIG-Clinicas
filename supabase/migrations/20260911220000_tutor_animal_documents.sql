-- Fase 7: documentos veterinários segregados do prontuário humano e visíveis somente ao tutor vinculado.
insert into storage.buckets(id, name, public) values ('animal-documents', 'animal-documents', false) on conflict(id) do update set public = false;

create table if not exists public.animal_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  animal_id uuid not null references public.animals(id),
  document_type text not null default 'clinical_document' check(document_type in ('clinical_document','exam','prescription','attachment')),
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  file_size bigint,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists animal_documents_animal_idx on public.animal_documents(animal_id, created_at desc);
create index if not exists animal_documents_clinic_idx on public.animal_documents(clinic_id, created_at desc);
grant select, insert, update on public.animal_documents to authenticated;
alter table public.animal_documents enable row level security;
create policy animal_documents_read on public.animal_documents for select to authenticated using(private.has_clinic_permission(organization_id, clinic_id, 'specialty.read'));
create policy animal_documents_write on public.animal_documents for insert to authenticated with check(private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));
create policy animal_documents_update on public.animal_documents for update to authenticated using(private.has_clinic_permission(organization_id, clinic_id, 'specialty.write')) with check(private.has_clinic_permission(organization_id, clinic_id, 'specialty.write'));

create or replace function private.is_tutor_of_animal(target_animal_id uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select private.has_role_code('tutor') and exists (
    select 1 from public.profiles profile join public.persons person on person.id = profile.person_id join public.animal_guardians guardian on guardian.person_id = person.id
    where profile.id = auth.uid() and guardian.animal_id = target_animal_id
  );
$$;
revoke all on function private.is_tutor_of_animal(uuid) from public;
grant execute on function private.is_tutor_of_animal(uuid) to authenticated;

create policy animal_documents_tutor_read on public.animal_documents for select to authenticated using(private.is_tutor_of_animal(animal_id));
create policy storage_animal_documents_clinical_read on storage.objects for select to authenticated using(bucket_id = 'animal-documents' and array_length(storage.foldername(name), 1) >= 2 and private.has_clinic_permission((storage.foldername(name))[1]::uuid, (select clinic_id from public.animals where id = (storage.foldername(name))[2]::uuid), 'specialty.read'));
create policy storage_animal_documents_clinical_insert on storage.objects for insert to authenticated with check(bucket_id = 'animal-documents' and array_length(storage.foldername(name), 1) >= 2 and private.has_clinic_permission((storage.foldername(name))[1]::uuid, (select clinic_id from public.animals where id = (storage.foldername(name))[2]::uuid), 'specialty.write'));
create policy storage_animal_documents_tutor_read on storage.objects for select to authenticated using(bucket_id = 'animal-documents' and array_length(storage.foldername(name), 1) >= 2 and private.is_tutor_of_animal((storage.foldername(name))[2]::uuid));

create or replace function private.get_my_tutor_documents()
returns table(document_id uuid, animal_id uuid, animal_name text, document_type text, file_name text, storage_path text, created_at timestamptz)
language sql stable security definer set search_path = public, private as $$
  select d.id,a.id,a.name,d.document_type,d.file_name,d.storage_path,d.created_at
  from public.animal_documents d join public.animals a on a.id=d.animal_id
  where d.archived_at is null and private.is_tutor_of_animal(d.animal_id)
  order by d.created_at desc limit 50;
$$;
create or replace function public.get_my_tutor_documents()
returns table(document_id uuid, animal_id uuid, animal_name text, document_type text, file_name text, storage_path text, created_at timestamptz)
language sql security invoker set search_path = public, private as $$ select * from private.get_my_tutor_documents(); $$;
revoke execute on function public.get_my_tutor_documents() from public, anon;
grant execute on function public.get_my_tutor_documents() to authenticated;
drop trigger if exists animal_documents_audit_row on public.animal_documents;
create trigger animal_documents_audit_row after insert or update on public.animal_documents for each row execute function private.audit_row_change();
