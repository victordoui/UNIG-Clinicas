-- Fase 6: trilha de preparação de lembretes e confirmações, sem disparo externo automático.
create table if not exists public.appointment_communication_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  appointment_id uuid not null references public.appointments(id),
  event_type text not null check(event_type in ('reminder_prepared','confirmation_registered','reschedule_requested')),
  channel text not null default 'whatsapp_prepared' check(channel in ('whatsapp_prepared','email_prepared','internal')),
  status text not null default 'prepared' check(status in ('prepared','registered','cancelled')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists appointment_communication_events_appointment_idx on public.appointment_communication_events(appointment_id, created_at desc);
create index if not exists appointment_communication_events_clinic_idx on public.appointment_communication_events(clinic_id, created_at desc);
grant select, insert on public.appointment_communication_events to authenticated;
alter table public.appointment_communication_events enable row level security;
create policy appointment_communication_events_read on public.appointment_communication_events for select to authenticated using(private.has_clinic_permission(organization_id, clinic_id, 'appointment.read'));
create policy appointment_communication_events_write on public.appointment_communication_events for insert to authenticated with check(private.has_clinic_permission(organization_id, clinic_id, 'appointment.manage'));
drop trigger if exists appointment_communication_events_audit_row on public.appointment_communication_events;
create trigger appointment_communication_events_audit_row after insert on public.appointment_communication_events for each row execute function private.audit_row_change();
