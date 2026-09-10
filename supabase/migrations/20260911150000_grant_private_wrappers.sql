-- Wrappers públicos SECURITY INVOKER precisam chamar as implementações privadas.
-- O anônimo recebe apenas a função QR, que retorna campos mínimos da sessão.
grant usage on schema private to anon;
grant execute on function private.get_public_queue_session(uuid) to anon;
grant execute on function private.transition_queue_ticket(uuid, text, text) to authenticated;
grant execute on function private.transition_queue_session(uuid, text) to authenticated;
grant execute on function private.join_queue_as_patient(uuid) to authenticated;
grant execute on function private.get_my_patient_portal() to authenticated;
grant execute on function private.get_my_tutor_animals() to authenticated;
grant execute on function private.transition_clinical_note(uuid, text, text) to authenticated;
