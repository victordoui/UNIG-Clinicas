-- Exposes only the operational status of one ticket when the caller knows
-- both the clinic QR token and the unguessable ticket id returned on entry.
create or replace function private.get_public_queue_ticket_status(
  target_token uuid,
  target_ticket_id uuid
) returns table(
  ticket_id uuid,
  ticket_number integer,
  ticket_code text,
  status text,
  service_box text,
  called_at timestamptz,
  people_ahead bigint
)
language sql stable security definer set search_path = public, private
as $function$
  select
    ticket.id,
    ticket.ticket_number,
    ticket.ticket_code,
    ticket.status,
    ticket.service_box,
    ticket.called_at,
    case
      when ticket.status = 'waiting' then (
        select count(*)
        from public.queue_tickets ahead
        where ahead.queue_session_id = ticket.queue_session_id
          and ahead.status = 'waiting'
          and (
            case ahead.priority when 'urgent' then 0 when 'priority' then 1 else 2 end,
            ahead.ticket_number
          ) < (
            case ticket.priority when 'urgent' then 0 when 'priority' then 1 else 2 end,
            ticket.ticket_number
          )
      )
      else 0
    end
  from public.queue_tickets ticket
  join public.queue_sessions session on session.id = ticket.queue_session_id
  join public.clinics clinic on clinic.id = session.clinic_id
  where ticket.id = target_ticket_id
    and clinic.queue_qr_token = target_token
  limit 1;
$function$;

revoke execute on function private.get_public_queue_ticket_status(uuid, uuid) from public;
grant execute on function private.get_public_queue_ticket_status(uuid, uuid) to anon, authenticated;

create or replace function public.get_public_queue_ticket_status(
  target_token uuid,
  target_ticket_id uuid
) returns table(
  ticket_id uuid,
  ticket_number integer,
  ticket_code text,
  status text,
  service_box text,
  called_at timestamptz,
  people_ahead bigint
)
language sql stable security invoker set search_path = public, private
as $function$
  select * from private.get_public_queue_ticket_status(target_token, target_ticket_id);
$function$;

revoke execute on function public.get_public_queue_ticket_status(uuid, uuid) from public;
grant execute on function public.get_public_queue_ticket_status(uuid, uuid) to anon, authenticated;
