-- Auditoria central mantém contexto antes/depois sem copiar segredos ou tokens.
create or replace function private.audit_row_change()
returns trigger language plpgsql security definer set search_path = public, private
as $function$
declare current_row jsonb; previous_row jsonb; new_row jsonb; organization_id_value uuid; entity_id_value uuid; safe_fields text[] := array['password','password_hash','token','public_token','access_token','refresh_token','service_role'];
begin
  previous_row := case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) - safe_fields else null end;
  new_row := case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) - safe_fields else null end;
  current_row := coalesce(new_row, previous_row);
  entity_id_value := (current_row->>'id')::uuid;
  if current_row ? 'organization_id' then organization_id_value := (current_row->>'organization_id')::uuid;
  elsif TG_TABLE_NAME = 'animal_guardians' then select a.organization_id into organization_id_value from public.animals a where a.id=(current_row->>'animal_id')::uuid;
  elsif TG_TABLE_NAME = 'queue_tickets' then select s.organization_id into organization_id_value from public.queue_sessions s where s.id=(current_row->>'queue_session_id')::uuid;
  elsif TG_TABLE_NAME = 'evaluations' then select s.organization_id into organization_id_value from public.student_supervisions s where s.id=(current_row->>'supervision_id')::uuid;
  elsif TG_TABLE_NAME = 'user_clinic_scopes' then select r.organization_id into organization_id_value from public.user_clinic_scopes scope join public.user_roles r on r.id=scope.user_role_id where scope.id=entity_id_value;
  end if;
  if organization_id_value is not null and entity_id_value is not null then
    insert into public.audit_logs(organization_id,actor_id,action,entity_table,entity_id,metadata)
      values(organization_id_value,auth.uid(),lower(TG_TABLE_NAME||'.'||TG_OP),TG_TABLE_NAME,entity_id_value,jsonb_build_object('operation',TG_OP,'previous_state',previous_row,'new_state',new_row));
  end if;
  return case when TG_OP='DELETE' then OLD else NEW end;
end;
$function$;
revoke execute on function private.audit_row_change() from public, anon, authenticated;
grant execute on function private.audit_row_change() to postgres;
