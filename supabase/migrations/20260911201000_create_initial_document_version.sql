-- Todo documento novo já nasce com a versão 1 preservada.
create or replace function private.create_initial_document_version()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  insert into public.document_versions(document_id, version, file_name, mime_type, storage_path, file_size, created_at, created_by)
  values (new.id, 1, new.file_name, new.mime_type, new.storage_path, new.file_size, new.created_at, new.created_by)
  on conflict(document_id, version) do nothing;
  return new;
end; $$;

drop trigger if exists documents_initial_version on public.documents;
create trigger documents_initial_version after insert on public.documents for each row execute function private.create_initial_document_version();
