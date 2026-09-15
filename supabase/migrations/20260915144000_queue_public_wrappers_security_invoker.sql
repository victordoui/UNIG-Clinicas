-- Keep public RPC wrappers subject to the caller's RLS context. Authorization
-- remains enforced by the private SECURITY DEFINER implementations.
create or replace function public.open_clinic_queue(target_clinic_id uuid)
returns public.queue_sessions language sql security invoker set search_path = public, private
as $function$ select private.open_clinic_queue(target_clinic_id); $function$;

create or replace function public.configure_queue_session(
  target_session_id uuid,
  target_clinic_service_id uuid default null,
  target_entry_mode text default 'both',
  target_max_capacity integer default 100,
  target_concurrent_capacity integer default 1,
  target_starts_at timestamptz default null,
  target_ends_at timestamptz default null
)
returns public.queue_sessions language sql security invoker set search_path = public, private
as $function$
  select private.configure_queue_session(
    target_session_id, target_clinic_service_id, target_entry_mode,
    target_max_capacity, target_concurrent_capacity, target_starts_at, target_ends_at
  );
$function$;
