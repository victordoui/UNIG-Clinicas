-- Fix the already-deployed guest entry function without duplicating its long
-- implementation. Fresh databases already receive the corrected variable
-- name from the hardening migration, so this block becomes a no-op there.
do $migration$
declare
  function_sql text;
begin
  select pg_get_functiondef(procedure.oid)
    into function_sql
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname = 'join_queue_as_guest'
    and pg_get_function_identity_arguments(procedure.oid) =
      'target_token uuid, guest_full_name text, guest_phone text, guest_birth_date date, guest_document_number text, accepted_data_terms boolean, accepted_policy_version text';

  if function_sql is null then
    raise exception 'private.join_queue_as_guest não encontrada';
  end if;

  if position('contact_fingerprint text;' in function_sql) > 0 then
    function_sql := replace(function_sql, 'contact_fingerprint text;', 'contact_fingerprint_value text;');
    function_sql := replace(function_sql, 'contact_fingerprint := md5', 'contact_fingerprint_value := md5');
    function_sql := replace(function_sql, 'attempt.contact_fingerprint = contact_fingerprint', 'attempt.contact_fingerprint = contact_fingerprint_value');
    function_sql := replace(function_sql, 'values (session_row.id, contact_fingerprint);', 'values (session_row.id, contact_fingerprint_value);');
    execute function_sql;
  end if;
end;
$migration$;
