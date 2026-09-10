-- Evoluções clínicas seguem o fluxo acadêmico do plano, com adendo/versionamento.
alter table public.clinical_notes
  add column if not exists workflow_status text not null default 'draft',
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewer_id uuid references auth.users(id),
  add column if not exists review_feedback text;
alter table public.clinical_notes drop constraint if exists clinical_notes_workflow_status_check;
alter table public.clinical_notes add constraint clinical_notes_workflow_status_check check (workflow_status in ('draft','submitted','under_review','changes_requested','approved'));
create index if not exists clinical_notes_workflow_idx on public.clinical_notes(workflow_status, authored_at desc);

create or replace function private.prevent_direct_note_workflow_change()
returns trigger language plpgsql security definer set search_path = public, private
as $function$
begin
  if TG_OP = 'UPDATE' and old.workflow_status is distinct from new.workflow_status and current_setting('unig.note_transition', true) <> '1' then
    raise exception 'Altere o ciclo da evolução pela função de transição';
  end if;
  return new;
end;
$function$;
revoke execute on function private.prevent_direct_note_workflow_change() from public, anon, authenticated;
drop trigger if exists clinical_notes_workflow_guard on public.clinical_notes;
create trigger clinical_notes_workflow_guard before update on public.clinical_notes for each row execute function private.prevent_direct_note_workflow_change();

create or replace function private.transition_clinical_note(target_note_id uuid, target_status text, target_feedback text default null)
returns public.clinical_notes
language plpgsql security definer set search_path = public, private
as $function$
declare note public.clinical_notes; record_row public.clinical_records; encounter public.encounters; previous_status text; can_review boolean;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória'; end if;
  select * into note from public.clinical_notes where id=target_note_id for update;
  if note.id is null then raise exception 'Evolução não encontrada'; end if;
  select * into record_row from public.clinical_records where id=note.clinical_record_id;
  select * into encounter from public.encounters where id=note.encounter_id;
  previous_status := note.workflow_status;
  can_review := encounter.id is not null and private.has_clinic_permission(encounter.organization_id, encounter.clinic_id, 'supervision.manage');
  if target_status in ('submitted') and note.author_id <> auth.uid() then raise exception 'Somente o autor pode enviar esta evolução'; end if;
  if target_status in ('under_review','changes_requested','approved') and not can_review then raise exception 'Sem permissão de supervisão para revisar esta evolução'; end if;
  if not ((note.workflow_status='draft' and target_status='submitted') or (note.workflow_status='changes_requested' and target_status='submitted') or (note.workflow_status='submitted' and target_status='under_review') or (note.workflow_status='under_review' and target_status in ('changes_requested','approved')) or (note.workflow_status='draft' and target_status='approved' and can_review)) then
    raise exception 'Transição de evolução inválida: % -> %', note.workflow_status, target_status;
  end if;
  perform set_config('unig.note_transition', '1', true);
  update public.clinical_notes set workflow_status=target_status,
    submitted_at=case when target_status='submitted' then now() else submitted_at end,
    reviewed_at=case when target_status in ('changes_requested','approved') then now() else reviewed_at end,
    reviewer_id=case when target_status in ('under_review','changes_requested','approved') then auth.uid() else reviewer_id end,
    review_feedback=case when target_status='changes_requested' then nullif(trim(target_feedback), '') else review_feedback end
  where id=note.id returning * into note;
  insert into public.audit_logs(organization_id,actor_id,action,entity_table,entity_id,metadata)
    values (record_row.organization_id,auth.uid(),'clinical_note.'||target_status,'clinical_notes',note.id,jsonb_build_object('previous_status',previous_status,'new_status',target_status,'has_feedback',target_feedback is not null));
  return note;
end;
$function$;

create or replace function public.transition_clinical_note(target_note_id uuid, target_status text, target_feedback text default null)
returns public.clinical_notes language sql security invoker set search_path = public, private
as $function$ select private.transition_clinical_note(target_note_id, target_status, target_feedback); $function$;
revoke execute on function public.transition_clinical_note(uuid, text, text) from public, anon;
grant execute on function public.transition_clinical_note(uuid, text, text) to authenticated;
