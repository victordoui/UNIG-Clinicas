-- A sessão de fila é a referência única da operação diária da clínica.
-- A tabela original já declarou a regra como UNIQUE; esta migração a garante
-- também em bases antigas que possam ter sido criadas antes dessa versão.
do $migration$
begin
  if not exists (
    select 1
    from pg_constraint constraint_info
    where constraint_info.conrelid = 'public.queue_sessions'::regclass
      and constraint_info.contype = 'u'
      and constraint_info.conkey = array[
        (select attnum from pg_attribute where attrelid = 'public.queue_sessions'::regclass and attname = 'clinic_id' and not attisdropped),
        (select attnum from pg_attribute where attrelid = 'public.queue_sessions'::regclass and attname = 'service_date' and not attisdropped)
      ]::smallint[]
  ) then
    alter table public.queue_sessions
      add constraint queue_sessions_one_per_clinic_day
      unique (clinic_id, service_date);
  end if;
end;
$migration$;
