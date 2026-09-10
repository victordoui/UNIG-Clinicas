-- Operação clínica: agenda e fila, sem conteúdo de prontuário.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  clinic_service_id uuid references public.clinic_services(id),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','checked_in','completed','cancelled','no_show')),
  reason text,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);
create table public.queue_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  service_date date not null default current_date,
  status text not null default 'open' check (status in ('open','paused','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (clinic_id, service_date)
);
create table public.queue_tickets (
  id uuid primary key default gen_random_uuid(),
  queue_session_id uuid not null references public.queue_sessions(id),
  patient_id uuid not null references public.patients(id),
  appointment_id uuid references public.appointments(id),
  ticket_number integer not null check (ticket_number > 0),
  priority text not null default 'normal' check (priority in ('normal','priority')),
  status text not null default 'waiting' check (status in ('waiting','called','in_service','completed','cancelled','no_show')),
  called_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  unique (queue_session_id, ticket_number)
);
create index appointments_clinic_scheduled_idx on public.appointments (clinic_id, scheduled_at);
create index appointments_patient_scheduled_idx on public.appointments (patient_id, scheduled_at desc);
create index queue_tickets_session_status_idx on public.queue_tickets (queue_session_id, status, priority, ticket_number);
create trigger appointments_set_updated_at before update on public.appointments for each row execute function private.set_updated_at();
create trigger queue_sessions_set_updated_at before update on public.queue_sessions for each row execute function private.set_updated_at();
create trigger queue_tickets_set_updated_at before update on public.queue_tickets for each row execute function private.set_updated_at();

insert into public.permissions (code, name, description) values
  ('appointment.read','Consultar agenda','Permite consultar agendamentos da organização.'),
  ('appointment.manage','Gerir agenda','Permite criar e atualizar agendamentos da organização.'),
  ('queue.read','Consultar fila','Permite consultar sessões e senhas da fila.'),
  ('queue.manage','Gerir fila','Permite operar sessões e senhas da fila.')
on conflict (code) do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('appointment.read','appointment.manage','queue.read','queue.manage')
where r.code in ('super_admin','organization_admin','clinic_manager','receptionist') on conflict do nothing;
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('appointment.read','queue.read')
where r.code in ('clinician','academic_supervisor','student','auditor') on conflict do nothing;

grant select, insert, update on public.appointments, public.queue_sessions, public.queue_tickets to authenticated;
alter table public.appointments enable row level security;
alter table public.queue_sessions enable row level security;
alter table public.queue_tickets enable row level security;
create policy appointments_select on public.appointments for select to authenticated using (private.has_permission(organization_id,'appointment.read'));
create policy appointments_insert on public.appointments for insert to authenticated with check (private.has_permission(organization_id,'appointment.manage'));
create policy appointments_update on public.appointments for update to authenticated using (private.has_permission(organization_id,'appointment.manage')) with check (private.has_permission(organization_id,'appointment.manage'));
create policy queue_sessions_select on public.queue_sessions for select to authenticated using (private.has_permission(organization_id,'queue.read'));
create policy queue_sessions_insert on public.queue_sessions for insert to authenticated with check (private.has_permission(organization_id,'queue.manage'));
create policy queue_sessions_update on public.queue_sessions for update to authenticated using (private.has_permission(organization_id,'queue.manage')) with check (private.has_permission(organization_id,'queue.manage'));
create policy queue_tickets_select on public.queue_tickets for select to authenticated using (exists (select 1 from public.queue_sessions session where session.id = queue_tickets.queue_session_id and private.has_permission(session.organization_id,'queue.read')));
create policy queue_tickets_insert on public.queue_tickets for insert to authenticated with check (exists (select 1 from public.queue_sessions session where session.id = queue_tickets.queue_session_id and private.has_permission(session.organization_id,'queue.manage')));
create policy queue_tickets_update on public.queue_tickets for update to authenticated using (exists (select 1 from public.queue_sessions session where session.id = queue_tickets.queue_session_id and private.has_permission(session.organization_id,'queue.manage'))) with check (exists (select 1 from public.queue_sessions session where session.id = queue_tickets.queue_session_id and private.has_permission(session.organization_id,'queue.manage')));
