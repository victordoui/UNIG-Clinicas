-- Fase 4: versões imutáveis e atestações eletrônicas auditáveis para documentos clínicos.
alter table public.documents add column if not exists current_version integer not null default 1 check (current_version >= 1);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  version integer not null check (version >= 1),
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  file_size bigint,
  content_sha256 text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique(document_id, version)
);

create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.document_versions(id),
  signer_user_id uuid not null references auth.users(id),
  signer_name text not null,
  signer_role text,
  signature_method text not null default 'authenticated_attestation' check (signature_method in ('authenticated_attestation')),
  declaration text not null,
  signed_at timestamptz not null default now(),
  unique(document_version_id, signer_user_id)
);

create index if not exists document_versions_document_idx on public.document_versions(document_id, version desc);
create index if not exists document_signatures_version_idx on public.document_signatures(document_version_id, signed_at desc);

insert into public.document_versions(document_id, version, file_name, mime_type, storage_path, file_size, created_at, created_by)
select id, 1, file_name, mime_type, storage_path, file_size, created_at, created_by
from public.documents
on conflict(document_id, version) do nothing;

grant select, insert on public.document_versions, public.document_signatures to authenticated;
alter table public.document_versions enable row level security;
alter table public.document_signatures enable row level security;

create policy document_versions_read on public.document_versions for select to authenticated using (
  exists (select 1 from public.documents d where d.id = document_id and ((d.patient_id is not null and private.has_patient_permission(d.organization_id, d.patient_id, 'clinical.read')) or (d.patient_id is null and d.encounter_id is not null and exists (select 1 from public.encounters e where e.id = d.encounter_id and private.has_clinic_permission(e.organization_id, e.clinic_id, 'clinical.read')))))
);
create policy document_versions_write on public.document_versions for insert to authenticated with check (
  exists (select 1 from public.documents d where d.id = document_id and ((d.patient_id is not null and private.has_patient_permission(d.organization_id, d.patient_id, 'clinical.write')) or (d.patient_id is null and d.encounter_id is not null and exists (select 1 from public.encounters e where e.id = d.encounter_id and private.has_clinic_permission(e.organization_id, e.clinic_id, 'clinical.write')))))
);
create policy document_signatures_read on public.document_signatures for select to authenticated using (
  exists (select 1 from public.document_versions v join public.documents d on d.id = v.document_id where v.id = document_version_id and ((d.patient_id is not null and private.has_patient_permission(d.organization_id, d.patient_id, 'clinical.read')) or (d.patient_id is null and d.encounter_id is not null and exists (select 1 from public.encounters e where e.id = d.encounter_id and private.has_clinic_permission(e.organization_id, e.clinic_id, 'clinical.read')))))
);
create policy document_signatures_write on public.document_signatures for insert to authenticated with check (
  signer_user_id = auth.uid() and exists (select 1 from public.document_versions v join public.documents d on d.id = v.document_id where v.id = document_version_id and ((d.patient_id is not null and private.has_patient_permission(d.organization_id, d.patient_id, 'clinical.write')) or (d.patient_id is null and d.encounter_id is not null and exists (select 1 from public.encounters e where e.id = d.encounter_id and private.has_clinic_permission(e.organization_id, e.clinic_id, 'clinical.write')))))
);

create or replace function private.create_document_version(target_document_id uuid, target_storage_path text, target_file_name text, target_mime_type text, target_file_size bigint, target_content_sha256 text default null)
returns public.document_versions language plpgsql security definer set search_path = public, private as $$
declare doc public.documents; next_version integer; inserted public.document_versions;
begin
  select * into doc from public.documents where id = target_document_id for update;
  if not found then raise exception 'Documento não encontrado'; end if;
  if not ((doc.patient_id is not null and private.has_patient_permission(doc.organization_id, doc.patient_id, 'clinical.write')) or (doc.patient_id is null and doc.encounter_id is not null and exists (select 1 from public.encounters e where e.id = doc.encounter_id and private.has_clinic_permission(e.organization_id, e.clinic_id, 'clinical.write')))) then raise exception 'Sem permissão para versionar este documento'; end if;
  next_version := doc.current_version + 1;
  insert into public.document_versions(document_id, version, file_name, mime_type, storage_path, file_size, content_sha256, created_by) values(target_document_id, next_version, target_file_name, target_mime_type, target_storage_path, target_file_size, target_content_sha256, auth.uid()) returning * into inserted;
  update public.documents set current_version = next_version, file_name = target_file_name, mime_type = target_mime_type, storage_path = target_storage_path, file_size = target_file_size where id = target_document_id;
  return inserted;
end; $$;

create or replace function public.create_document_version(target_document_id uuid, target_storage_path text, target_file_name text, target_mime_type text, target_file_size bigint, target_content_sha256 text default null)
returns public.document_versions language sql security invoker set search_path = public, private as $$ select * from private.create_document_version(target_document_id, target_storage_path, target_file_name, target_mime_type, target_file_size, target_content_sha256); $$;
revoke execute on function public.create_document_version(uuid, text, text, text, bigint, text) from public, anon;
grant execute on function public.create_document_version(uuid, text, text, text, bigint, text) to authenticated;

create or replace function private.sign_document_version(target_document_version_id uuid, target_signer_name text, target_signer_role text default null, target_declaration text default 'Confirmo que revisei e assino eletronicamente esta versão do documento.')
returns public.document_signatures language plpgsql security definer set search_path = public, private as $$
declare signature public.document_signatures;
begin
  if coalesce(trim(target_signer_name), '') = '' then raise exception 'Nome do signatário é obrigatório'; end if;
  if not exists (select 1 from public.document_versions v join public.documents d on d.id = v.document_id where v.id = target_document_version_id and ((d.patient_id is not null and private.has_patient_permission(d.organization_id, d.patient_id, 'clinical.write')) or (d.patient_id is null and d.encounter_id is not null and exists (select 1 from public.encounters e where e.id = d.encounter_id and private.has_clinic_permission(e.organization_id, e.clinic_id, 'clinical.write'))))) then raise exception 'Sem permissão para assinar esta versão'; end if;
  insert into public.document_signatures(document_version_id, signer_user_id, signer_name, signer_role, declaration) values(target_document_version_id, auth.uid(), trim(target_signer_name), nullif(trim(target_signer_role), ''), coalesce(nullif(trim(target_declaration), ''), 'Confirmo que revisei e assino eletronicamente esta versão do documento.')) returning * into signature;
  return signature;
end; $$;

create or replace function public.sign_document_version(target_document_version_id uuid, target_signer_name text, target_signer_role text default null, target_declaration text default 'Confirmo que revisei e assino eletronicamente esta versão do documento.')
returns public.document_signatures language sql security invoker set search_path = public, private as $$ select * from private.sign_document_version(target_document_version_id, target_signer_name, target_signer_role, target_declaration); $$;
revoke execute on function public.sign_document_version(uuid, text, text, text) from public, anon;
grant execute on function public.sign_document_version(uuid, text, text, text) to authenticated;

drop trigger if exists document_versions_audit_row on public.document_versions;
create trigger document_versions_audit_row after insert on public.document_versions for each row execute function private.audit_row_change();
drop trigger if exists document_signatures_audit_row on public.document_signatures;
create trigger document_signatures_audit_row after insert on public.document_signatures for each row execute function private.audit_row_change();
