-- A clínica mantém uma única sessão por dia. Encerrar a operação não cria
-- outra sessão; a própria sessão pode ser reaberta pela equipe autorizada.
create or replace function private.transition_queue_session(target_session_id uuid, target_status text)
returns public.queue_sessions language plpgsql security definer set search_path = public, private
as $function$
declare current_session public.queue_sessions; previous_status text; allowed boolean;
begin
  select * into current_session from public.queue_sessions where id = target_session_id for update;
  if current_session.id is null then raise exception 'Fila não encontrada'; end if;
  if not private.has_clinic_permission(current_session.organization_id, current_session.clinic_id, 'queue.manage') then
    raise exception 'Sem permissão para operar esta fila';
  end if;
  previous_status := current_session.status;
  allowed := (current_session.status = 'open' and target_status in ('paused', 'closed'))
    or (current_session.status = 'paused' and target_status in ('open', 'closed'))
    or (current_session.status = 'closed' and target_status = 'open' and current_session.service_date = current_date);
  if not allowed then
    raise exception 'Transição de fila inválida: % -> %', current_session.status, target_status;
  end if;
  perform set_config('unig.queue_transition', '1', true);
  update public.queue_sessions
  set status = target_status, updated_at = now(), updated_by = auth.uid()
  where id = current_session.id
  returning * into current_session;
  insert into public.queue_events(organization_id, clinic_id, queue_session_id, event_type, previous_status, new_status, actor_id)
  values (current_session.organization_id, current_session.clinic_id, current_session.id, 'session.' || target_status, previous_status, target_status, auth.uid());
  return current_session;
end;
$function$;
