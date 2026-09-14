-- O escritor fica no schema privado para não expor inserções arbitrárias em
-- queue_events; a RPC pública abaixo apenas dispara este caso específico.
create or replace function private.record_reception_recall(
  target_ticket_id uuid
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  ticket_row public.queue_tickets;
  queue_row public.queue_sessions;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão obrigatória';
  end if;

  select * into ticket_row
  from public.queue_tickets
  where id = target_ticket_id;
  if ticket_row.id is null then
    raise exception 'Senha não encontrada';
  end if;
  if ticket_row.status not in ('called', 'checked_in', 'in_service') then
    raise exception 'A senha atual não pode ser chamada novamente';
  end if;

  select * into queue_row
  from public.queue_sessions
  where id = ticket_row.queue_session_id;
  if not private.has_clinic_permission(queue_row.organization_id, queue_row.clinic_id, 'queue.manage') then
    raise exception 'Sem permissão para operar esta fila';
  end if;

  insert into public.queue_events(
    organization_id, clinic_id, queue_session_id, queue_ticket_id,
    event_type, previous_status, new_status, actor_id, metadata
  ) values (
    queue_row.organization_id, queue_row.clinic_id, queue_row.id, ticket_row.id,
    'reception.recalled', ticket_row.status, ticket_row.status, auth.uid(),
    jsonb_build_object('recalled_at', now())
  );
end;
$$;

revoke execute on function private.record_reception_recall(uuid) from public, anon;
grant execute on function private.record_reception_recall(uuid) to authenticated;

-- Repete o anúncio sem avançar nem alterar o estado da senha atual.
create or replace function public.recall_reception_ticket(
  target_ticket_id uuid
) returns void
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão obrigatória';
  end if;
  perform private.record_reception_recall(target_ticket_id);
end;
$$;

revoke execute on function public.recall_reception_ticket(uuid) from public, anon;
grant execute on function public.recall_reception_ticket(uuid) to authenticated;
