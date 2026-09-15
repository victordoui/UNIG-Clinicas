-- LEITURA SOMENTE. Execute no SQL Editor do projeto hhwsqzaookfohqygihyc
-- e envie o resultado completo para validação antes de rodar a migration.

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('queue_sessions', 'queue_tickets', 'queue_events', 'clinics')
order by table_name, ordinal_position;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in (
  'public.queue_sessions'::regclass,
  'public.queue_tickets'::regclass
)
order by conrelid::regclass::text, conname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('queue_sessions', 'queue_tickets', 'queue_events')
order by tablename, policyname;

select routine_schema, routine_name, data_type as return_type
from information_schema.routines
where routine_schema in ('public', 'private')
  and routine_name in (
    'issue_queue_ticket', 'join_queue_as_patient', 'join_queue_as_guest',
    'get_public_queue_session', 'transition_queue_session',
    'transition_queue_ticket', 'open_clinic_queue'
  )
order by routine_schema, routine_name;
