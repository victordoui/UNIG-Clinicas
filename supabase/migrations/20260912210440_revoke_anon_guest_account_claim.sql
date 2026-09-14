-- O vínculo de conta exige sessão autenticada e e-mail confirmado.
revoke execute on function public.claim_verified_guest_patient_account() from anon;
grant execute on function public.claim_verified_guest_patient_account() to authenticated;
