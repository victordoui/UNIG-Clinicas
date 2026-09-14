-- Dados administrativos da recepção, isolados do prontuário e vinculados à senha.
create table public.reception_sessions (
  id uuid primary key default gen_random_uuid(),
  queue_ticket_id uuid not null references public.queue_tickets(id),
  organization_id uuid not null references public.organizations(id),
  clinic_id uuid not null references public.clinics(id),
  workstation_id text not null,
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  ended_by uuid references auth.users(id),
  ended_at timestamptz,
  reason text,
  observation text check (char_length(observation) <= 500),
  tags text[] not null default '{}',
  destination text,
  call_next_automatically boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index reception_sessions_one_active_workstation_idx
  on public.reception_sessions(clinic_id, workstation_id) where ended_at is null;
create unique index reception_sessions_one_active_ticket_idx
  on public.reception_sessions(queue_ticket_id) where ended_at is null;
create index reception_sessions_clinic_active_idx
  on public.reception_sessions(clinic_id, started_at desc) where ended_at is null;
create trigger reception_sessions_set_updated_at before update on public.reception_sessions
  for each row execute function private.set_updated_at();

grant select, insert, update on public.reception_sessions to authenticated;
alter table public.reception_sessions enable row level security;
create policy reception_sessions_read on public.reception_sessions for select to authenticated
  using (private.has_clinic_permission(organization_id, clinic_id, 'queue.read'));
create policy reception_sessions_insert on public.reception_sessions for insert to authenticated
  with check (private.has_clinic_permission(organization_id, clinic_id, 'queue.manage') and started_by = (select auth.uid()));
create policy reception_sessions_update on public.reception_sessions for update to authenticated
  using (private.has_clinic_permission(organization_id, clinic_id, 'queue.manage'))
  with check (private.has_clinic_permission(organization_id, clinic_id, 'queue.manage'));

-- O histórico operacional permanece em queue_events, que já é auditável e realtime.
create or replace function public.record_reception_event(
  target_session_id uuid,
  target_event text,
  target_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security invoker set search_path = public, private as $$
declare session_row public.reception_sessions; ticket_row public.queue_tickets;
begin
  select * into session_row from public.reception_sessions where id = target_session_id;
  if session_row.id is null then raise exception 'Atendimento de recepção não encontrado'; end if;
  if not private.has_clinic_permission(session_row.organization_id, session_row.clinic_id, 'queue.manage') then raise exception 'Sem permissão para operar esta fila'; end if;
  select * into ticket_row from public.queue_tickets where id = session_row.queue_ticket_id;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, queue_ticket_id, event_type, actor_id, metadata)
  values (session_row.organization_id, session_row.clinic_id, ticket_row.queue_session_id, ticket_row.id, target_event, auth.uid(), target_metadata);
end;
$$;
revoke execute on function public.record_reception_event(uuid, text, jsonb) from public, anon;
grant execute on function public.record_reception_event(uuid, text, jsonb) to authenticated;

-- As três ações do drawer passam por funções transacionais: o cliente não decide
-- o estado da senha nem consegue criar dois atendimentos na mesma estação.
create or replace function public.start_reception_session(
  target_ticket_id uuid,
  target_workstation_id text
) returns public.reception_sessions language plpgsql security invoker set search_path = public, private as $$
declare ticket_row public.queue_tickets; queue_row public.queue_sessions; session_row public.reception_sessions;
begin
  if (select auth.uid()) is null then raise exception 'Sessão obrigatória'; end if;
  select * into ticket_row from public.queue_tickets where id = target_ticket_id for update;
  if ticket_row.id is null then raise exception 'Senha não encontrada'; end if;
  select * into queue_row from public.queue_sessions where id = ticket_row.queue_session_id;
  if not private.has_clinic_permission(queue_row.organization_id, queue_row.clinic_id, 'queue.manage') then raise exception 'Sem permissão para operar esta fila'; end if;
  select * into session_row from public.reception_sessions where queue_ticket_id = target_ticket_id and ended_at is null;
  if session_row.id is not null then return session_row; end if;
  if exists (select 1 from public.reception_sessions where clinic_id = queue_row.clinic_id and workstation_id = target_workstation_id and ended_at is null) then raise exception 'Existe um atendimento em andamento nesta estação'; end if;
  if ticket_row.status = 'called' then perform public.transition_queue_ticket(ticket_row.id, 'checked_in', target_workstation_id); end if;
  if ticket_row.status in ('called', 'checked_in') then perform public.transition_queue_ticket(ticket_row.id, 'in_service', target_workstation_id); end if;
  insert into public.reception_sessions(queue_ticket_id, organization_id, clinic_id, workstation_id, started_by)
  values(target_ticket_id, queue_row.organization_id, queue_row.clinic_id, target_workstation_id, auth.uid())
  returning * into session_row;
  perform public.record_reception_event(session_row.id, 'reception.started', jsonb_build_object('workstation_id', target_workstation_id));
  return session_row;
end;
$$;

create or replace function public.save_reception_session(
  target_session_id uuid, target_reason text, target_observation text,
  target_tags text[], target_destination text, target_call_next boolean
) returns public.reception_sessions language plpgsql security invoker set search_path = public, private as $$
declare session_row public.reception_sessions;
begin
  update public.reception_sessions set reason = target_reason, observation = target_observation,
    tags = coalesce(target_tags, '{}'), destination = target_destination,
    call_next_automatically = target_call_next
  where id = target_session_id and ended_at is null returning * into session_row;
  if session_row.id is null then raise exception 'Atendimento não encontrado ou já encerrado'; end if;
  perform public.record_reception_event(session_row.id, 'reception.updated', jsonb_build_object('destination', target_destination));
  return session_row;
end;
$$;

create or replace function public.finish_reception_session(
  target_session_id uuid, target_reason text, target_observation text,
  target_tags text[], target_destination text, target_call_next boolean
) returns public.reception_sessions language plpgsql security invoker set search_path = public, private as $$
declare session_row public.reception_sessions; ticket_row public.queue_tickets; next_ticket_id uuid; next_status text;
begin
  perform public.save_reception_session(target_session_id, target_reason, target_observation, target_tags, target_destination, target_call_next);
  update public.reception_sessions set ended_at = now(), ended_by = auth.uid()
  where id = target_session_id and ended_at is null returning * into session_row;
  if session_row.id is null then raise exception 'Atendimento já encerrado'; end if;
  select * into ticket_row from public.queue_tickets where id = session_row.queue_ticket_id;
  next_status := case
    when target_destination = 'Atendimento administrativo concluído' then 'completed'
    when target_destination = 'Cancelado' then 'cancelled'
    else 'transferred'
  end;
  perform public.transition_queue_ticket(ticket_row.id, next_status, target_destination);
  perform public.record_reception_event(session_row.id, 'reception.completed', jsonb_build_object('destination', target_destination, 'call_next_automatically', target_call_next));
  if target_call_next then
    select id into next_ticket_id from public.queue_tickets
      where queue_session_id = ticket_row.queue_session_id and status = 'waiting'
      order by case when priority = 'priority' then 0 else 1 end, ticket_number
      for update skip locked limit 1;
    if next_ticket_id is not null then
      perform public.transition_queue_ticket(next_ticket_id, 'called', null);
    end if;
  end if;
  return session_row;
end;
$$;

revoke execute on function public.start_reception_session(uuid, text), public.save_reception_session(uuid, text, text, text[], text, boolean), public.finish_reception_session(uuid, text, text, text[], text, boolean) from public, anon;
grant execute on function public.start_reception_session(uuid, text), public.save_reception_session(uuid, text, text, text[], text, boolean), public.finish_reception_session(uuid, text, text, text[], text, boolean) to authenticated;
