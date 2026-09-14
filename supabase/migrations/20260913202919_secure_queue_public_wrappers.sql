-- Os wrappers públicos são a única entrada REST. As implementações privadas
-- já verificam os escopos e, por isso, não concedemos EXECUTE nelas a anon ou
-- authenticated. Sem SECURITY DEFINER nos wrappers, o PostgreSQL exige esse
-- privilégio e as RPCs falham antes de executar suas validações.

create or replace function public.join_queue_as_guest(
  target_token uuid,
  guest_full_name text,
  guest_phone text,
  guest_birth_date date default null,
  guest_document_number text default null,
  accepted_data_terms boolean default false,
  accepted_policy_version text default '2026-09'
)
returns table(ticket_id uuid, ticket_number integer, queue_session_id uuid)
language sql
security definer
set search_path = public, private
as $function$
  select * from private.join_queue_as_guest(
    target_token, guest_full_name, guest_phone, guest_birth_date,
    guest_document_number, accepted_data_terms, accepted_policy_version
  );
$function$;

create or replace function public.attach_guest_email_to_ticket(
  target_ticket_id uuid,
  guest_email text
)
returns void
language sql
security definer
set search_path = public, private
as $function$
  select private.attach_guest_email_to_ticket(target_ticket_id, guest_email);
$function$;

create or replace function public.claim_verified_guest_patient_account()
returns table(patient_id uuid, clinic_count integer)
language sql
security definer
set search_path = public, private
as $function$
  select * from private.claim_verified_guest_patient_account();
$function$;

create or replace function public.get_clinic_operational_analytics(
  target_clinic_id uuid default null,
  date_from date default current_date - 29,
  date_to date default current_date
)
returns jsonb
language sql
security definer
set search_path = public, private
as $function$
  select private.get_clinic_operational_analytics(target_clinic_id, date_from, date_to);
$function$;

revoke execute on function public.join_queue_as_guest(uuid, text, text, date, text, boolean, text) from public;
revoke execute on function public.attach_guest_email_to_ticket(uuid, text) from public;
revoke execute on function public.claim_verified_guest_patient_account() from public;
revoke execute on function public.get_clinic_operational_analytics(uuid, date, date) from public;

grant execute on function public.join_queue_as_guest(uuid, text, text, date, text, boolean, text) to anon, authenticated;
grant execute on function public.attach_guest_email_to_ticket(uuid, text) to anon, authenticated;
grant execute on function public.claim_verified_guest_patient_account() to authenticated;
grant execute on function public.get_clinic_operational_analytics(uuid, date, date) to authenticated;
