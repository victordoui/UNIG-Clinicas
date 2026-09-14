-- Fase 4: lista de espera e preferências administrativas de comunicação.
-- Reutiliza pacientes, clínicas e serviços existentes; nenhum cadastro paralelo é criado.

create table public.appointment_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  clinic_service_id uuid references public.clinic_services(id),
  preferred_from timestamptz,
  preferred_until timestamptz,
  priority text not null default 'normal' check (priority in ('normal', 'priority')),
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'accepted', 'declined', 'expired', 'cancelled')),
  contact_channel text not null default 'phone' check (contact_channel in ('phone', 'whatsapp', 'email', 'internal')),
  notes text,
  offered_appointment_id uuid references public.appointments(id),
  offered_at timestamptz,
  contacted_at timestamptz,
  contacted_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  check (preferred_until is null or preferred_from is null or preferred_until >= preferred_from)
);

create index appointment_waitlist_entries_open_idx
  on public.appointment_waitlist_entries (clinic_id, status, priority, created_at)
  where status in ('waiting', 'offered');
create index appointment_waitlist_entries_patient_idx
  on public.appointment_waitlist_entries (patient_id, created_at desc);

create table public.patient_contact_preferences (
  patient_id uuid primary key references public.patients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  preferred_channels text[] not null default array['phone']::text[]
    check (preferred_channels <@ array['phone', 'whatsapp', 'email', 'sms']::text[]),
  preferred_language text not null default 'pt-BR',
  accessibility_notes text,
  reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.appointment_waitlist_entries enable row level security;
alter table public.patient_contact_preferences enable row level security;
grant select, insert, update on public.appointment_waitlist_entries, public.patient_contact_preferences to authenticated;

create policy appointment_waitlist_entries_read
  on public.appointment_waitlist_entries for select to authenticated
  using (private.has_clinic_permission(organization_id, clinic_id, 'appointment.read'));
create policy appointment_waitlist_entries_write
  on public.appointment_waitlist_entries for insert to authenticated
  with check (private.has_clinic_permission(organization_id, clinic_id, 'appointment.manage'));
create policy appointment_waitlist_entries_update
  on public.appointment_waitlist_entries for update to authenticated
  using (private.has_clinic_permission(organization_id, clinic_id, 'appointment.manage'))
  with check (private.has_clinic_permission(organization_id, clinic_id, 'appointment.manage'));

create policy patient_contact_preferences_read
  on public.patient_contact_preferences for select to authenticated
  using (private.has_patient_permission(organization_id, patient_id, 'patient.read'));
create policy patient_contact_preferences_write
  on public.patient_contact_preferences for insert to authenticated
  with check (private.has_patient_permission(organization_id, patient_id, 'patient.manage'));
create policy patient_contact_preferences_update
  on public.patient_contact_preferences for update to authenticated
  using (private.has_patient_permission(organization_id, patient_id, 'patient.manage'))
  with check (private.has_patient_permission(organization_id, patient_id, 'patient.manage'));

create trigger appointment_waitlist_entries_set_updated_at
  before update on public.appointment_waitlist_entries
  for each row execute function private.set_updated_at();
create trigger patient_contact_preferences_set_updated_at
  before update on public.patient_contact_preferences
  for each row execute function private.set_updated_at();
create trigger appointment_waitlist_entries_audit_row
  after insert or update on public.appointment_waitlist_entries
  for each row execute function private.audit_row_change();
