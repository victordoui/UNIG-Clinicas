-- Atomic ticket allocation prevents duplicate numbers under concurrent reception use.
create function public.issue_queue_ticket(
  target_queue_session_id uuid,
  target_patient_id uuid,
  ticket_priority text default 'normal',
  target_appointment_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = public
as $$
declare new_ticket_id uuid; next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext(target_queue_session_id::text));
  select coalesce(max(ticket_number), 0) + 1 into next_number
  from public.queue_tickets where queue_session_id = target_queue_session_id;
  insert into public.queue_tickets (queue_session_id, patient_id, appointment_id, ticket_number, priority, created_by, updated_by)
  values (target_queue_session_id, target_patient_id, target_appointment_id, next_number, ticket_priority, auth.uid(), auth.uid())
  returning id into new_ticket_id;
  return new_ticket_id;
end; $$;
revoke execute on function public.issue_queue_ticket(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.issue_queue_ticket(uuid, uuid, text, uuid) to authenticated;
