-- Consent metadata and private clinical document references.
create table public.consents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), patient_id uuid not null references public.patients(id),
 consent_type text not null, status text not null default 'pending' check(status in ('pending','granted','revoked','expired')),
 granted_at timestamptz, revoked_at timestamptz, expires_at timestamptz, version text not null default '1', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), patient_id uuid references public.patients(id), encounter_id uuid references public.encounters(id),
 document_type text not null check(document_type in ('consent','exam','clinical_document','attachment')), file_name text not null, mime_type text not null, storage_path text not null unique, file_size bigint,
 archived_at timestamptz, created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create index consents_patient_idx on public.consents(patient_id,created_at desc); create index documents_patient_idx on public.documents(patient_id,created_at desc);
create trigger consents_updated_at before update on public.consents for each row execute function private.set_updated_at();
insert into storage.buckets(id,name,public) values('clinical-documents','clinical-documents',false) on conflict(id) do update set public=false;
grant select,insert,update on public.consents,public.documents to authenticated;
alter table public.consents enable row level security; alter table public.documents enable row level security;
create policy consents_read on public.consents for select to authenticated using(private.has_permission(organization_id,'clinical.read'));
create policy consents_write on public.consents for insert to authenticated with check(private.has_permission(organization_id,'clinical.write'));
create policy consents_update on public.consents for update to authenticated using(private.has_permission(organization_id,'clinical.write')) with check(private.has_permission(organization_id,'clinical.write'));
create policy documents_read on public.documents for select to authenticated using(private.has_permission(organization_id,'clinical.read'));
create policy documents_write on public.documents for insert to authenticated with check(private.has_permission(organization_id,'clinical.write'));
create policy storage_documents_read on storage.objects for select to authenticated using(bucket_id='clinical-documents' and private.has_permission((storage.foldername(name))[1]::uuid,'clinical.read'));
create policy storage_documents_insert on storage.objects for insert to authenticated with check(bucket_id='clinical-documents' and private.has_permission((storage.foldername(name))[1]::uuid,'clinical.write'));
create policy storage_documents_update on storage.objects for update to authenticated using(bucket_id='clinical-documents' and private.has_permission((storage.foldername(name))[1]::uuid,'clinical.write')) with check(bucket_id='clinical-documents' and private.has_permission((storage.foldername(name))[1]::uuid,'clinical.write'));
