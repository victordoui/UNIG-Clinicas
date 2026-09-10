-- Keep the privileged implementation out of the exposed API schema.
alter function public.create_clinical_note(uuid,text,text,uuid,text) set schema private;
revoke execute on function private.create_clinical_note(uuid,text,text,uuid,text) from public, anon;
grant execute on function private.create_clinical_note(uuid,text,text,uuid,text) to authenticated;

create function public.create_clinical_note(target_encounter_id uuid, target_note_type text, note_content text, correction_of uuid default null, correction_reason text default null) returns uuid
language sql security invoker set search_path = public, private as $$
  select private.create_clinical_note(target_encounter_id, target_note_type, note_content, correction_of, correction_reason);
$$;
revoke execute on function public.create_clinical_note(uuid,text,text,uuid,text) from public, anon;
grant execute on function public.create_clinical_note(uuid,text,text,uuid,text) to authenticated;
