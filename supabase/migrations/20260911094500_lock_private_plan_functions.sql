-- Funções privilegiadas ficam fora do caminho de execução do cliente.
revoke execute on function private.transition_queue_ticket(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.transition_queue_session(uuid, text) from public, anon, authenticated;
revoke execute on function private.get_public_queue_session(uuid) from public, anon, authenticated;
