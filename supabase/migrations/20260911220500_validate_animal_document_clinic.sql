-- Impede associação cruzada entre documento veterinário e clínica do animal.
create or replace function private.validate_animal_document_clinic()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare animal_clinic_id uuid; animal_organization_id uuid;
begin
  select clinic_id, organization_id into animal_clinic_id, animal_organization_id from public.animals where id = new.animal_id;
  if animal_clinic_id is null then raise exception 'Animal não encontrado'; end if;
  if new.clinic_id <> animal_clinic_id or new.organization_id <> animal_organization_id then
    raise exception 'O documento deve pertencer à mesma clínica e organização do animal';
  end if;
  return new;
end; $$;
drop trigger if exists animal_documents_validate_clinic on public.animal_documents;
create trigger animal_documents_validate_clinic before insert or update on public.animal_documents for each row execute function private.validate_animal_document_clinic();
