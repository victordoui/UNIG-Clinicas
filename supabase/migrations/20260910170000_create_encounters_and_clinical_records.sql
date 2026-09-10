-- Clinical core: operational encounter and append-only clinical notes.
create table public.encounters (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id), patient_id uuid not null references public.patients(id),
  appointment_id uuid references public.appointments(id), queue_ticket_id uuid references public.queue_tickets(id),
  status text not null default 'in_progress' check (status in ('in_progress','completed','cancelled')),
  started_at timestamptz not null default now(), ended_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id), updated_by uuid references auth.users(id)
);
create table public.clinical_records (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  patient_id uuid not null references public.patients(id), created_at timestamptz not null default now(), created_by uuid references auth.users(id),
  unique (organization_id, patient_id)
);
create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(), clinical_record_id uuid not null references public.clinical_records(id),
  encounter_id uuid references public.encounters(id), supersedes_note_id uuid references public.clinical_notes(id),
  note_type text not null default 'evolution' check (note_type in ('evolution','assessment','procedure','correction')),
  content text not null, authored_at timestamptz not null default now(), signed_at timestamptz, author_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.clinical_note_versions (
  id uuid primary key default gen_random_uuid(), clinical_note_id uuid not null references public.clinical_notes(id),
  version_number integer not null check (version_number > 0), content text not null, reason text, author_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique (clinical_note_id, version_number)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  actor_id uuid references auth.users(id), action text not null, entity_table text not null, entity_id uuid not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index encounters_clinic_started_idx on public.encounters(clinic_id, started_at desc);
create index encounters_patient_started_idx on public.encounters(patient_id, started_at desc);
create index clinical_notes_record_authored_idx on public.clinical_notes(clinical_record_id, authored_at desc);
create index note_versions_note_idx on public.clinical_note_versions(clinical_note_id, version_number);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);
create trigger encounters_updated_at before update on public.encounters for each row execute function private.set_updated_at();

insert into public.permissions (code,name,description) values
 ('clinical.read','Consultar prontuário','Permite consultar atendimentos e evoluções clínicas.'),
 ('clinical.write','Registrar evolução','Permite registrar atendimentos e evoluções clínicas.')
on conflict (code) do nothing;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r join public.permissions p on p.code in ('clinical.read','clinical.write') where r.code in ('super_admin','organization_admin','clinic_manager','clinician','academic_supervisor') on conflict do nothing;
insert into public.role_permissions(role_id,permission_id) select r.id,p.id from public.roles r join public.permissions p on p.code='clinical.read' where r.code in ('student','receptionist','auditor') on conflict do nothing;

grant select,insert,update on public.encounters to authenticated;
grant select on public.clinical_records, public.clinical_notes, public.clinical_note_versions, public.audit_logs to authenticated;
alter table public.encounters enable row level security; alter table public.clinical_records enable row level security; alter table public.clinical_notes enable row level security; alter table public.clinical_note_versions enable row level security; alter table public.audit_logs enable row level security;
create policy encounters_read on public.encounters for select to authenticated using (private.has_permission(organization_id,'clinical.read'));
create policy encounters_write on public.encounters for insert to authenticated with check (private.has_permission(organization_id,'clinical.write'));
create policy encounters_update on public.encounters for update to authenticated using (private.has_permission(organization_id,'clinical.write')) with check (private.has_permission(organization_id,'clinical.write'));
create policy records_read on public.clinical_records for select to authenticated using (private.has_permission(organization_id,'clinical.read'));
create policy notes_read on public.clinical_notes for select to authenticated using (exists(select 1 from public.clinical_records r where r.id=clinical_notes.clinical_record_id and private.has_permission(r.organization_id,'clinical.read')));
create policy versions_read on public.clinical_note_versions for select to authenticated using (exists(select 1 from public.clinical_notes n join public.clinical_records r on r.id=n.clinical_record_id where n.id=clinical_note_versions.clinical_note_id and private.has_permission(r.organization_id,'clinical.read')));
create policy audit_read on public.audit_logs for select to authenticated using (private.has_permission(organization_id,'audit.read'));

create function public.create_clinical_note(target_encounter_id uuid, target_note_type text, note_content text, correction_of uuid default null, correction_reason text default null) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare org_id uuid; record_id uuid; note_id uuid;
begin
 select organization_id, patient_id into org_id, record_id from public.encounters where id=target_encounter_id;
 if org_id is null then raise exception 'Atendimento não encontrado'; end if;
 if not private.has_permission(org_id,'clinical.write') then raise exception 'Sem permissão clínica'; end if;
 select id into record_id from public.clinical_records where organization_id=org_id and patient_id=(select patient_id from public.encounters where id=target_encounter_id);
 if record_id is null then insert into public.clinical_records(organization_id,patient_id,created_by) values(org_id,(select patient_id from public.encounters where id=target_encounter_id),auth.uid()) returning id into record_id; end if;
 insert into public.clinical_notes(clinical_record_id,encounter_id,supersedes_note_id,note_type,content,author_id) values(record_id,target_encounter_id,correction_of,target_note_type,note_content,auth.uid()) returning id into note_id;
 insert into public.clinical_note_versions(clinical_note_id,version_number,content,reason,author_id) values(note_id,1,note_content,correction_reason,auth.uid());
 insert into public.audit_logs(organization_id,actor_id,action,entity_table,entity_id,metadata) values(org_id,auth.uid(),'clinical_note.created','clinical_notes',note_id,jsonb_build_object('encounter_id',target_encounter_id,'note_type',target_note_type));
 return note_id;
end; $$;
revoke execute on function public.create_clinical_note(uuid,text,text,uuid,text) from public, anon; grant execute on function public.create_clinical_note(uuid,text,text,uuid,text) to authenticated;
