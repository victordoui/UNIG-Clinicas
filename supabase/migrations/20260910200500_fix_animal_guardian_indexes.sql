drop index if exists public.animal_guardians_person_fk_idx;
create index if not exists animal_guardians_created_by_fk_idx on public.animal_guardians(created_by);
