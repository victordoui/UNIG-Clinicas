-- Conversão segura do visitante: somente e-mail confirmado no Supabase pode
-- vincular a conta ao paciente mínimo originado pelo QR.

create or replace function private.attach_guest_email_to_ticket(
  target_ticket_id uuid,
  guest_email text
)
returns void
language plpgsql security definer set search_path = public, private
as $function$
declare
  ticket_row record;
  normalized_email text := lower(trim(coalesce(guest_email, '')));
begin
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Informe um e-mail válido';
  end if;

  select ticket.id, ticket.patient_id, session.organization_id
    into ticket_row
  from public.queue_tickets ticket
  join public.queue_sessions session on session.id = ticket.queue_session_id
  join public.patients patient on patient.id = ticket.patient_id
  where ticket.id = target_ticket_id
    and ticket.entry_source = 'qr_guest'
    and patient.registration_status = 'minimal';

  if ticket_row.id is null then
    raise exception 'Esta senha não pode ser vinculada a uma conta de visitante';
  end if;

  update public.persons
     set email = normalized_email,
         updated_at = now()
   where id = (select person_id from public.patients where id = ticket_row.patient_id)
     and (email is null or lower(email) = normalized_email);

  if not found then
    raise exception 'Este visitante já possui outro e-mail cadastrado';
  end if;

  insert into public.audit_logs(organization_id, actor_id, action, entity_table, entity_id, metadata)
  values (ticket_row.organization_id, null, 'guest.email_registered', 'queue_tickets', target_ticket_id, '{}'::jsonb);
end;
$function$;

create or replace function public.attach_guest_email_to_ticket(
  target_ticket_id uuid,
  guest_email text
)
returns void
language sql security invoker set search_path = public, private
as $function$
  select private.attach_guest_email_to_ticket(target_ticket_id, guest_email);
$function$;

create or replace function private.claim_verified_guest_patient_account()
returns table(patient_id uuid, clinic_count integer)
language plpgsql security definer set search_path = public, private, auth
as $function$
declare
  caller_id uuid := auth.uid();
  verified_email text;
  candidate record;
  match_count integer;
  patient_role_id uuid;
  user_role_id uuid;
begin
  if caller_id is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'É necessário entrar em uma conta permanente';
  end if;

  select lower(email) into verified_email
  from auth.users
  where id = caller_id and email_confirmed_at is not null;
  if verified_email is null then
    raise exception 'Confirme seu e-mail antes de vincular seu cadastro';
  end if;

  select count(*) into match_count
  from public.patients patient
  join public.persons person on person.id = patient.person_id
  join public.patient_data_consents consent on consent.patient_id = patient.id and consent.purpose = 'queue_guest_registration'
  where patient.registration_status = 'minimal'
    and lower(person.email) = verified_email;
  if match_count = 0 then
    return;
  elsif match_count > 1 then
    raise exception 'Há mais de um cadastro pendente com este e-mail; solicite validação na recepção';
  end if;

  select patient.id, patient.person_id, patient.organization_id
    into candidate
  from public.patients patient
  join public.persons person on person.id = patient.person_id
  where patient.registration_status = 'minimal'
    and lower(person.email) = verified_email
  limit 1;

  if exists (select 1 from public.profiles where id = caller_id and person_id is not null and person_id <> candidate.person_id) then
    raise exception 'Esta conta já está vinculada a outro cadastro';
  end if;

  update public.profiles set person_id = candidate.person_id, updated_at = now() where id = caller_id;
  if not found then
    raise exception 'Perfil da conta ainda não está disponível; tente novamente em alguns segundos';
  end if;

  select id into patient_role_id from public.roles where code = 'patient';
  insert into public.user_roles(user_id, organization_id, role_id, is_active)
  values (caller_id, candidate.organization_id, patient_role_id, true)
  on conflict (user_id, organization_id, role_id) do update set is_active = true;
  select id into user_role_id from public.user_roles where user_id = caller_id and organization_id = candidate.organization_id and role_id = patient_role_id and is_active;
  insert into public.user_clinic_scopes(user_role_id, clinic_id, revoked_at)
  select user_role_id, link.clinic_id, null from public.patient_clinic_links link where link.patient_id = candidate.id
  on conflict (user_role_id, clinic_id) do update set revoked_at = null;

  update public.patients set registration_status = 'complete', profile_completed_at = now() where id = candidate.id;
  insert into public.audit_logs(organization_id, actor_id, action, entity_table, entity_id, metadata)
  values (candidate.organization_id, caller_id, 'guest.account_claimed', 'patients', candidate.id, '{}'::jsonb);

  return query select candidate.id, (select count(*)::integer from public.patient_clinic_links where patient_id = candidate.id);
end;
$function$;

create or replace function public.claim_verified_guest_patient_account()
returns table(patient_id uuid, clinic_count integer)
language sql security invoker set search_path = public, private
as $function$
  select * from private.claim_verified_guest_patient_account();
$function$;

revoke execute on function private.attach_guest_email_to_ticket(uuid, text), private.claim_verified_guest_patient_account() from public, anon, authenticated;
revoke execute on function public.attach_guest_email_to_ticket(uuid, text), public.claim_verified_guest_patient_account() from public;
grant execute on function public.attach_guest_email_to_ticket(uuid, text) to anon, authenticated;
grant execute on function public.claim_verified_guest_patient_account() to authenticated;
