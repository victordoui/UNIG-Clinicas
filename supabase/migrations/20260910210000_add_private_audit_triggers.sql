create or replace function private.audit_row_change()
returns trigger language plpgsql security definer set search_path = public, private
as $function$
declare current_row jsonb; organization_id_value uuid; entity_id_value uuid;
begin
  current_row := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  entity_id_value := (current_row->>'id')::uuid;
  if current_row ? 'organization_id' then organization_id_value := (current_row->>'organization_id')::uuid;
  elsif TG_TABLE_NAME = 'animal_guardians' then select a.organization_id into organization_id_value from public.animals a where a.id=(current_row->>'animal_id')::uuid;
  elsif TG_TABLE_NAME = 'queue_tickets' then select s.organization_id into organization_id_value from public.queue_sessions s where s.id=(current_row->>'queue_session_id')::uuid;
  elsif TG_TABLE_NAME = 'evaluations' then select s.organization_id into organization_id_value from public.evaluations e join public.student_supervisions s on s.id=e.supervision_id where e.id=entity_id_value;
  elsif TG_TABLE_NAME = 'user_clinic_scopes' then select r.organization_id into organization_id_value from public.user_clinic_scopes scope join public.user_roles r on r.id=scope.user_role_id where scope.id=entity_id_value;
  end if;
  if organization_id_value is not null and entity_id_value is not null then
    insert into public.audit_logs(organization_id,actor_id,action,entity_table,entity_id,metadata) values(organization_id_value,(select auth.uid()),lower(TG_TABLE_NAME||'.'||TG_OP),TG_TABLE_NAME,entity_id_value,jsonb_build_object('operation',TG_OP));
  end if;
  return case when TG_OP='DELETE' then OLD else NEW end;
end;
$function$;
revoke execute on function private.audit_row_change() from public, anon, authenticated;
grant execute on function private.audit_row_change() to postgres;

drop trigger if exists persons_audit_row on public.persons; create trigger persons_audit_row after insert or update or delete on public.persons for each row execute function private.audit_row_change();
drop trigger if exists patients_audit_row on public.patients; create trigger patients_audit_row after insert or update or delete on public.patients for each row execute function private.audit_row_change();
drop trigger if exists clinics_audit_row on public.clinics; create trigger clinics_audit_row after insert or update or delete on public.clinics for each row execute function private.audit_row_change();
drop trigger if exists clinic_services_audit_row on public.clinic_services; create trigger clinic_services_audit_row after insert or update or delete on public.clinic_services for each row execute function private.audit_row_change();
drop trigger if exists appointments_audit_row on public.appointments; create trigger appointments_audit_row after insert or update or delete on public.appointments for each row execute function private.audit_row_change();
drop trigger if exists queue_sessions_audit_row on public.queue_sessions; create trigger queue_sessions_audit_row after insert or update or delete on public.queue_sessions for each row execute function private.audit_row_change();
drop trigger if exists queue_tickets_audit_row on public.queue_tickets; create trigger queue_tickets_audit_row after insert or update or delete on public.queue_tickets for each row execute function private.audit_row_change();
drop trigger if exists encounters_audit_row on public.encounters; create trigger encounters_audit_row after insert or update or delete on public.encounters for each row execute function private.audit_row_change();
drop trigger if exists clinical_procedures_audit_row on public.clinical_procedures; create trigger clinical_procedures_audit_row after insert or update or delete on public.clinical_procedures for each row execute function private.audit_row_change();
drop trigger if exists exam_orders_audit_row on public.exam_orders; create trigger exam_orders_audit_row after insert or update or delete on public.exam_orders for each row execute function private.audit_row_change();
drop trigger if exists consents_audit_row on public.consents; create trigger consents_audit_row after insert or update or delete on public.consents for each row execute function private.audit_row_change();
drop trigger if exists documents_audit_row on public.documents; create trigger documents_audit_row after insert or update or delete on public.documents for each row execute function private.audit_row_change();
drop trigger if exists animals_audit_row on public.animals; create trigger animals_audit_row after insert or update or delete on public.animals for each row execute function private.audit_row_change();
drop trigger if exists animal_guardians_audit_row on public.animal_guardians; create trigger animal_guardians_audit_row after insert or update or delete on public.animal_guardians for each row execute function private.audit_row_change();
drop trigger if exists student_supervisions_audit_row on public.student_supervisions; create trigger student_supervisions_audit_row after insert or update or delete on public.student_supervisions for each row execute function private.audit_row_change();
drop trigger if exists evaluations_audit_row on public.evaluations; create trigger evaluations_audit_row after insert or update or delete on public.evaluations for each row execute function private.audit_row_change();
drop trigger if exists organization_settings_audit_row on public.organization_settings; create trigger organization_settings_audit_row after insert or update or delete on public.organization_settings for each row execute function private.audit_row_change();
drop trigger if exists user_roles_audit_row on public.user_roles; create trigger user_roles_audit_row after insert or update or delete on public.user_roles for each row execute function private.audit_row_change();
drop trigger if exists user_clinic_scopes_audit_row on public.user_clinic_scopes; create trigger user_clinic_scopes_audit_row after insert or update or delete on public.user_clinic_scopes for each row execute function private.audit_row_change();
