-- Identidade para os portais: a conta aponta para o cadastro mestre, nunca para CPF como ID.
alter table public.profiles add column if not exists person_id uuid references public.persons(id);
create index if not exists profiles_person_idx on public.profiles(person_id);

insert into public.roles(code, name, description) values
  ('patient', 'Paciente', 'Acesso ao próprio portal e aos próprios atendimentos.'),
  ('tutor', 'Tutor', 'Acesso ao portal dos animais sob sua responsabilidade.')
on conflict (code) do nothing;
insert into public.permissions(code, name, description) values
  ('portal.read', 'Acessar portal', 'Permite consultar os dados próprios do portal.'),
  ('queue.join', 'Entrar na fila', 'Permite solicitar entrada em uma fila autorizada.'),
  ('appointment.self.read', 'Consultar próprios agendamentos', 'Permite consultar os próprios horários.'),
  ('record.self.read', 'Consultar próprio histórico', 'Permite consultar documentos e histórico autorizado.'),
  ('animal.read', 'Consultar animais próprios', 'Permite consultar animais vinculados ao tutor.'),
  ('animal.manage', 'Gerir animais próprios', 'Permite cadastrar e atualizar animais próprios.'),
  ('evaluation.create', 'Enviar avaliação', 'Permite avaliar um atendimento próprio.')
on conflict (code) do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code in ('portal.read','queue.join','appointment.self.read','record.self.read','evaluation.create') where r.code='patient' on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code in ('portal.read','queue.join','appointment.self.read','record.self.read','animal.read','animal.manage','evaluation.create') where r.code='tutor' on conflict do nothing;

create or replace function private.current_person_id()
returns uuid language sql stable security definer set search_path = public, private
as $function$ select person_id from public.profiles where id = (select auth.uid()); $function$;
revoke execute on function private.current_person_id() from public, anon, authenticated;
grant execute on function private.current_person_id() to authenticated;

create or replace function private.is_patient_self(target_patient_id uuid)
returns boolean language sql stable security definer set search_path = public, private
as $function$ select exists(select 1 from public.patients p where p.id=target_patient_id and p.person_id=private.current_person_id()); $function$;
revoke execute on function private.is_patient_self(uuid) from public, anon;
grant execute on function private.is_patient_self(uuid) to authenticated;

create or replace function private.is_animal_tutor(target_animal_id uuid)
returns boolean language sql stable security definer set search_path = public, private
as $function$ select exists(select 1 from public.animal_guardians g join public.animals a on a.id=g.animal_id where g.animal_id=target_animal_id and g.person_id=private.current_person_id()); $function$;
revoke execute on function private.is_animal_tutor(uuid) from public, anon;
grant execute on function private.is_animal_tutor(uuid) to authenticated;
