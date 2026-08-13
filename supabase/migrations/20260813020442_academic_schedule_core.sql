-- Fonte central de grade, ensalamento, publicação e histórico.
-- Criada a partir do schema remoto exportado em supabase/remote_schema.sql.
-- Esta migration não altera nem substitui classes.schedule durante a transição.

create extension if not exists btree_gist;

create table public.academic_schedules (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  course_id uuid references public.courses(id) on delete restrict,
  academic_period text not null,
  name text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  starts_on date,
  ends_on date,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on),
  unique (unit_id, course_id, academic_period, version)
);

create table public.class_meetings (
  id uuid primary key default gen_random_uuid(),
  academic_schedule_id uuid not null references public.academic_schedules(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  professor_id uuid references public.professors(id) on delete restrict,
  room_id uuid references public.rooms(id) on delete restrict,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  status text not null default 'planned'
    check (status in ('planned', 'published', 'cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (academic_schedule_id, class_id, weekday, starts_at)
);

-- Índices nas chaves de consulta e relacionamento.
create index academic_schedules_unit_period_idx
  on public.academic_schedules (unit_id, academic_period, status);
create index academic_schedules_course_period_idx
  on public.academic_schedules (course_id, academic_period)
  where course_id is not null;
create index class_meetings_schedule_idx
  on public.class_meetings (academic_schedule_id, weekday, starts_at);
create index class_meetings_class_idx
  on public.class_meetings (class_id, weekday, starts_at)
  where status <> 'cancelled';

-- A faixa de minutos permite ao Postgres bloquear inserções concorrentes.
alter table public.class_meetings
  add column time_slot int4range generated always as (
    int4range(
      (extract(hour from starts_at)::integer * 60) + extract(minute from starts_at)::integer,
      (extract(hour from ends_at)::integer * 60) + extract(minute from ends_at)::integer,
      '[)'
    )
  ) stored;

alter table public.class_meetings
  add constraint class_meetings_no_room_overlap
  exclude using gist (room_id with =, weekday with =, time_slot with &&)
  where (room_id is not null and status <> 'cancelled');

alter table public.class_meetings
  add constraint class_meetings_no_professor_overlap
  exclude using gist (professor_id with =, weekday with =, time_slot with &&)
  where (professor_id is not null and status <> 'cancelled');

alter table public.class_meetings
  add constraint class_meetings_no_class_overlap
  exclude using gist (class_id with =, weekday with =, time_slot with &&)
  where (status <> 'cancelled');

create table public.academic_schedule_versions (
  id uuid primary key default gen_random_uuid(),
  academic_schedule_id uuid not null references public.academic_schedules(id) on delete cascade,
  version integer not null check (version > 0),
  action text not null check (action in ('created', 'published', 'archived')),
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (academic_schedule_id, version, action)
);

create index academic_schedule_versions_schedule_idx
  on public.academic_schedule_versions (academic_schedule_id, version desc);

create or replace function public.snapshot_academic_schedule()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('published', 'archived')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.academic_schedule_versions (
      academic_schedule_id, version, action, snapshot, created_by
    )
    select
      new.id,
      new.version,
      new.status,
      jsonb_build_object(
        'schedule', to_jsonb(new),
        'meetings', coalesce((
          select jsonb_agg(to_jsonb(meeting) order by meeting.weekday, meeting.starts_at)
          from public.class_meetings meeting
          where meeting.academic_schedule_id = new.id
        ), '[]'::jsonb)
      ),
      coalesce(new.published_by, new.created_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger academic_schedules_updated_at
  before update on public.academic_schedules
  for each row execute function public.set_updated_at();
create trigger class_meetings_updated_at
  before update on public.class_meetings
  for each row execute function public.set_updated_at();
create trigger academic_schedules_snapshot
  after insert or update of status on public.academic_schedules
  for each row execute function public.snapshot_academic_schedule();

alter table public.academic_schedules enable row level security;
alter table public.class_meetings enable row level security;
alter table public.academic_schedule_versions enable row level security;

-- Leitura de grade publicada para usuários autenticados. Escrita exige função
-- acadêmica e respeita a unidade do papel atribuído.
create policy academic_schedules_read on public.academic_schedules
  for select to authenticated
  using (
    status = 'published'
    or exists (
      select 1 from public.user_roles role
      where role.user_id = (select auth.uid())
        and role.is_active
        and role.role in ('super_admin', 'administrador', 'secretaria', 'coordenacao', 'gestor_unidade')
        and (role.unit_id is null or role.unit_id = academic_schedules.unit_id)
    )
  );

create policy academic_schedules_write on public.academic_schedules
  for all to authenticated
  using (
    exists (
      select 1 from public.user_roles role
      where role.user_id = (select auth.uid())
        and role.is_active
        and role.role in ('super_admin', 'administrador', 'secretaria', 'coordenacao', 'gestor_unidade')
        and (role.unit_id is null or role.unit_id = academic_schedules.unit_id)
    )
  )
  with check (
    exists (
      select 1 from public.user_roles role
      where role.user_id = (select auth.uid())
        and role.is_active
        and role.role in ('super_admin', 'administrador', 'secretaria', 'coordenacao', 'gestor_unidade')
        and (role.unit_id is null or role.unit_id = academic_schedules.unit_id)
    )
  );

create policy class_meetings_read on public.class_meetings
  for select to authenticated
  using (
    exists (
      select 1 from public.academic_schedules schedule
      where schedule.id = class_meetings.academic_schedule_id
    )
  );

create policy class_meetings_write on public.class_meetings
  for all to authenticated
  using (
    exists (
      select 1
      from public.academic_schedules schedule
      join public.user_roles role on role.user_id = (select auth.uid())
      where schedule.id = class_meetings.academic_schedule_id
        and role.is_active
        and role.role in ('super_admin', 'administrador', 'secretaria', 'coordenacao', 'gestor_unidade')
        and (role.unit_id is null or role.unit_id = schedule.unit_id)
    )
  )
  with check (
    exists (
      select 1
      from public.academic_schedules schedule
      join public.user_roles role on role.user_id = (select auth.uid())
      where schedule.id = class_meetings.academic_schedule_id
        and role.is_active
        and role.role in ('super_admin', 'administrador', 'secretaria', 'coordenacao', 'gestor_unidade')
        and (role.unit_id is null or role.unit_id = schedule.unit_id)
    )
  );

create policy academic_schedule_versions_read on public.academic_schedule_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.academic_schedules schedule
      where schedule.id = academic_schedule_versions.academic_schedule_id
    )
  );
