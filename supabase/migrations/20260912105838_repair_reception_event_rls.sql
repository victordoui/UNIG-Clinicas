-- queue_events não permite inserção direta por usuários autenticados. Esta
-- função mantém a trilha de auditoria através de uma fronteira privilegiada
-- mínima, validando sessão e escopo da clínica antes de gravar o evento.
create or replace function public.record_reception_event(
  target_session_id uuid,
  target_event text,
  target_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  session_row public.reception_sessions;
  ticket_row public.queue_tickets;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão obrigatória';
  end if;

  select * into session_row
  from public.reception_sessions
  where id = target_session_id;
  if session_row.id is null then
    raise exception 'Atendimento de recepção não encontrado';
  end if;
  if not private.has_clinic_permission(session_row.organization_id, session_row.clinic_id, 'queue.manage') then
    raise exception 'Sem permissão para operar esta fila';
  end if;

  select * into ticket_row
  from public.queue_tickets
  where id = session_row.queue_ticket_id;
  insert into public.queue_events(
    organization_id, clinic_id, queue_session_id, queue_ticket_id,
    event_type, actor_id, metadata
  ) values (
    session_row.organization_id, session_row.clinic_id, ticket_row.queue_session_id,
    ticket_row.id, target_event, auth.uid(), coalesce(target_metadata, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.record_reception_event(uuid, text, jsonb) from public, anon;
grant execute on function public.record_reception_event(uuid, text, jsonb) to authenticated;
