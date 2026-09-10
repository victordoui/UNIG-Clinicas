-- Nenhum cliente pode alterar o estado da fila ignorando a máquina de estados.
create or replace function private.prevent_direct_queue_status_change()
returns trigger language plpgsql security definer set search_path = public, private
as $function$
begin
  if TG_OP = 'UPDATE' and old.status is distinct from new.status and current_setting('unig.queue_transition', true) <> '1' then
    raise exception 'Altere o estado da fila pela função de transição';
  end if;
  return new;
end;
$function$;
revoke execute on function private.prevent_direct_queue_status_change() from public, anon, authenticated;
drop trigger if exists queue_sessions_status_guard on public.queue_sessions;
create trigger queue_sessions_status_guard before update on public.queue_sessions for each row execute function private.prevent_direct_queue_status_change();
drop trigger if exists queue_tickets_status_guard on public.queue_tickets;
create trigger queue_tickets_status_guard before update on public.queue_tickets for each row execute function private.prevent_direct_queue_status_change();

create or replace function private.transition_queue_ticket(
  target_ticket_id uuid,
  target_status text,
  target_service_box text default null
) returns public.queue_tickets
language plpgsql security definer set search_path = public, private
as $function$
declare
  ticket public.queue_tickets;
  session public.queue_sessions;
  allowed boolean := false;
  previous_status text;
begin
  if (select auth.uid()) is null then raise exception 'Sessão obrigatória'; end if;
  select * into ticket from public.queue_tickets where id = target_ticket_id for update;
  if ticket.id is null then raise exception 'Senha não encontrada'; end if;
  select * into session from public.queue_sessions where id = ticket.queue_session_id;
  if session.id is null then raise exception 'Fila não encontrada'; end if;
  previous_status := ticket.status;
  if not private.has_clinic_permission(session.organization_id, session.clinic_id, 'queue.manage') then raise exception 'Sem permissão para operar esta fila'; end if;
  allowed := case ticket.status
    when 'waiting' then target_status in ('called','cancelled','no_show','transferred','paused')
    when 'called' then target_status in ('checked_in','in_service','cancelled','no_show','transferred')
    when 'checked_in' then target_status in ('in_service','cancelled','no_show','transferred')
    when 'in_service' then target_status in ('waiting_supervision','completed','cancelled','transferred')
    when 'waiting_supervision' then target_status in ('completed','in_service','transferred')
    when 'paused' then target_status in ('waiting','cancelled','transferred')
    else false
  end;
  if not allowed then raise exception 'Transição de fila inválida: % -> %', ticket.status, target_status; end if;
  if target_status = 'in_service' and (select count(*) from public.queue_tickets active where active.queue_session_id = ticket.queue_session_id and active.status = 'in_service' and active.id <> ticket.id) >= session.concurrent_capacity then
    raise exception 'A capacidade simultânea desta fila foi atingida';
  end if;
  perform set_config('unig.queue_transition', '1', true);
  update public.queue_tickets set status = target_status,
    called_at = case when target_status = 'called' then coalesce(called_at, now()) else called_at end,
    checked_in_at = case when target_status = 'checked_in' then coalesce(checked_in_at, now()) else checked_in_at end,
    service_started_at = case when target_status = 'in_service' then coalesce(service_started_at, now()) else service_started_at end,
    supervision_waiting_at = case when target_status = 'waiting_supervision' then coalesce(supervision_waiting_at, now()) else supervision_waiting_at end,
    completed_at = case when target_status = 'completed' then coalesce(completed_at, now()) else completed_at end,
    cancelled_at = case when target_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
    no_show_at = case when target_status = 'no_show' then coalesce(no_show_at, now()) else no_show_at end,
    transferred_at = case when target_status = 'transferred' then coalesce(transferred_at, now()) else transferred_at end,
    service_box = coalesce(target_service_box, service_box), updated_at = now(), updated_by = auth.uid()
  where id = ticket.id returning * into ticket;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, queue_ticket_id, event_type, previous_status, new_status, actor_id, metadata)
    values (session.organization_id, session.clinic_id, session.id, ticket.id, 'ticket.' || target_status, previous_status, target_status, auth.uid(), jsonb_build_object('service_box', target_service_box));
  return ticket;
end;
$function$;

create or replace function private.transition_queue_session(target_session_id uuid, target_status text)
returns public.queue_sessions language plpgsql security definer set search_path = public, private
as $function$
declare current_session public.queue_sessions; previous_status text;
begin
  select * into current_session from public.queue_sessions where id = target_session_id for update;
  if current_session.id is null then raise exception 'Fila não encontrada'; end if;
  previous_status := current_session.status;
  if not private.has_clinic_permission(current_session.organization_id, current_session.clinic_id, 'queue.manage') then raise exception 'Sem permissão para operar esta fila'; end if;
  if not ((current_session.status = 'open' and target_status in ('paused','closed')) or (current_session.status = 'paused' and target_status in ('open','closed'))) then raise exception 'Transição de fila inválida: % -> %', current_session.status, target_status; end if;
  perform set_config('unig.queue_transition', '1', true);
  update public.queue_sessions set status = target_status, updated_at = now(), updated_by = auth.uid() where id = current_session.id returning * into current_session;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, event_type, previous_status, new_status, actor_id)
    values (current_session.organization_id, current_session.clinic_id, current_session.id, 'session.' || target_status, previous_status, target_status, auth.uid());
  return current_session;
end;
$function$;

create or replace function public.issue_queue_ticket(target_queue_session_id uuid, target_patient_id uuid, ticket_priority text default 'normal', target_appointment_id uuid default null)
returns uuid language plpgsql security invoker set search_path = public, private
as $function$
declare new_ticket_id uuid; next_number integer; session public.queue_sessions; active_count integer;
begin
  select * into session from public.queue_sessions where id = target_queue_session_id;
  if session.id is null then raise exception 'Fila não encontrada'; end if;
  if session.status <> 'open' then raise exception 'A fila não está aberta'; end if;
  if not private.has_clinic_permission(session.organization_id, session.clinic_id, 'queue.manage') then raise exception 'Sem permissão para emitir senha nesta clínica'; end if;
  if not exists (select 1 from public.patients patient join public.patient_clinic_links link on link.patient_id=patient.id and link.clinic_id=session.clinic_id where patient.id=target_patient_id and patient.organization_id=session.organization_id and patient.status='active') then raise exception 'Paciente não está vinculado a esta clínica'; end if;
  perform pg_advisory_xact_lock(hashtext(target_queue_session_id::text));
  select count(*) into active_count from public.queue_tickets where queue_session_id=target_queue_session_id and status in ('waiting','called','checked_in','in_service','waiting_supervision','paused');
  if active_count >= session.max_capacity then raise exception 'A capacidade máxima desta fila foi atingida'; end if;
  select coalesce(max(ticket_number), 0) + 1 into next_number from public.queue_tickets where queue_session_id = target_queue_session_id;
  insert into public.queue_tickets (queue_session_id, patient_id, appointment_id, ticket_number, priority, created_by, updated_by) values (target_queue_session_id, target_patient_id, target_appointment_id, next_number, ticket_priority, auth.uid(), auth.uid()) returning id into new_ticket_id;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, queue_ticket_id, event_type, new_status, actor_id) values (session.organization_id, session.clinic_id, session.id, new_ticket_id, 'ticket.issued', 'waiting', auth.uid());
  return new_ticket_id;
end;
$function$;
revoke execute on function public.issue_queue_ticket(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.issue_queue_ticket(uuid, uuid, text, uuid) to authenticated;
