-- O escritor de eventos é interno: a UI só pode invocar as três operações
-- transacionais do atendimento, nunca registrar eventos arbitrários.
alter function public.record_reception_event(uuid, text, jsonb) set schema private;
revoke execute on function private.record_reception_event(uuid, text, jsonb) from public, anon;
grant execute on function private.record_reception_event(uuid, text, jsonb) to authenticated;

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
  values(target_ticket_id, queue_row.organization_id, queue_row.clinic_id, target_workstation_id, auth.uid()) returning * into session_row;
  perform private.record_reception_event(session_row.id, 'reception.started', jsonb_build_object('workstation_id', target_workstation_id));
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
  perform private.record_reception_event(session_row.id, 'reception.updated', jsonb_build_object('destination', target_destination));
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
  next_status := case when target_destination = 'Atendimento administrativo concluído' then 'completed' when target_destination = 'Cancelado' then 'cancelled' else 'transferred' end;
  perform public.transition_queue_ticket(ticket_row.id, next_status, target_destination);
  perform private.record_reception_event(session_row.id, 'reception.completed', jsonb_build_object('destination', target_destination, 'call_next_automatically', target_call_next));
  if target_call_next then
    select id into next_ticket_id from public.queue_tickets where queue_session_id = ticket_row.queue_session_id and status = 'waiting'
      order by case when priority = 'priority' then 0 else 1 end, ticket_number for update skip locked limit 1;
    if next_ticket_id is not null then perform public.transition_queue_ticket(next_ticket_id, 'called', null); end if;
  end if;
  return session_row;
end;
$$;

revoke execute on function public.start_reception_session(uuid, text), public.save_reception_session(uuid, text, text, text[], text, boolean), public.finish_reception_session(uuid, text, text, text[], text, boolean) from public, anon;
grant execute on function public.start_reception_session(uuid, text), public.save_reception_session(uuid, text, text, text[], text, boolean), public.finish_reception_session(uuid, text, text, text[], text, boolean) to authenticated;
