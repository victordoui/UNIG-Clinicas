-- Acessos rápidos de teste para o UNIG Clínicas.
-- Uso exclusivo de homologação/demonstração: as contas têm senha conhecida e
-- não devem existir em um ambiente produtivo com dados reais.
-- Cada perfil clínico recebe escopo de uma única clínica, exceto perfis
-- institucionais explicitamente globais.

do $block$
declare
  target_organization_id uuid;
  target_user_id uuid;
  target_role_id uuid;
  target_clinic_id uuid;
  target_person_id uuid;
  target_patient_id uuid;
  target_animal_id uuid;
  demo record;
begin
  select id into target_organization_id
  from public.organizations
  where is_active
  order by created_at
  limit 1;

  if target_organization_id is null then
    raise exception 'Não existe organização ativa para preparar os acessos de teste';
  end if;

  for demo in
    select * from (values
      ('super-admin@unig.demo', 'Super Admin — Teste', 'super_admin', null::text),
      ('organization-admin@unig.demo', 'Administrador da organização — Teste', 'organization_admin', null::text),
      ('auditor@unig.demo', 'Auditor — Teste', 'auditor', null::text),
      ('clinic-manager-odonto@unig.demo', 'Gestor de Odontologia — Teste', 'clinic_manager', 'ODONTO'),
      ('clinician-odonto@unig.demo', 'Profissional de Odontologia — Teste', 'clinician', 'ODONTO'),
      ('receptionist-odonto@unig.demo', 'Recepção de Odontologia — Teste', 'receptionist', 'ODONTO'),
      ('academic-supervisor-odonto@unig.demo', 'Supervisor de Odontologia — Teste', 'academic_supervisor', 'ODONTO'),
      ('student-odonto@unig.demo', 'Aluno de Odontologia — Teste', 'student', 'ODONTO'),
      ('clinic-manager-fisio@unig.demo', 'Gestor de Fisioterapia — Teste', 'clinic_manager', 'FISIO'),
      ('clinician-fisio@unig.demo', 'Profissional de Fisioterapia — Teste', 'clinician', 'FISIO'),
      ('receptionist-fisio@unig.demo', 'Recepção de Fisioterapia — Teste', 'receptionist', 'FISIO'),
      ('clinic-manager-vet@unig.demo', 'Gestor de Veterinária — Teste', 'clinic_manager', 'VET'),
      ('clinician-vet@unig.demo', 'Profissional de Veterinária — Teste', 'clinician', 'VET'),
      ('receptionist-vet@unig.demo', 'Recepção de Veterinária — Teste', 'receptionist', 'VET'),
      ('clinic-manager-estetica@unig.demo', 'Gestor de Estética — Teste', 'clinic_manager', 'ESTETICA'),
      ('clinician-estetica@unig.demo', 'Profissional de Estética — Teste', 'clinician', 'ESTETICA'),
      ('receptionist-estetica@unig.demo', 'Recepção de Estética — Teste', 'receptionist', 'ESTETICA'),
      ('patient-odonto@unig.demo', 'Paciente de Odontologia — Teste', 'patient', 'ODONTO'),
      ('patient-fisio@unig.demo', 'Paciente de Fisioterapia — Teste', 'patient', 'FISIO'),
      ('patient-vet@unig.demo', 'Paciente de Veterinária — Teste', 'patient', 'VET'),
      ('patient-estetica@unig.demo', 'Paciente de Estética — Teste', 'patient', 'ESTETICA'),
      ('tutor-vet@unig.demo', 'Tutor de Veterinária — Teste', 'tutor', 'VET')
    ) as accounts(email, full_name, role_code, clinic_code)
  loop
    select id into target_role_id from public.roles where code = demo.role_code;
    if target_role_id is null then
      raise exception 'Papel % não encontrado; aplique antes as migrations de RBAC', demo.role_code;
    end if;

    if demo.clinic_code is not null then
      select id into target_clinic_id
      from public.clinics
      where organization_id = target_organization_id
        and code = demo.clinic_code
        and is_active
      limit 1;
      if target_clinic_id is null then
        raise exception 'Clínica de código % não encontrada para o acesso de teste', demo.clinic_code;
      end if;
    else
      target_clinic_id := null;
    end if;

    select id into target_user_id from auth.users where email = demo.email;
    if target_user_id is null then
      target_user_id := gen_random_uuid();
      insert into auth.users(
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmed_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, is_anonymous, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', target_user_id,
        'authenticated', 'authenticated', demo.email,
        crypt('unig1234', gen_salt('bf')), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', demo.full_name, 'demo_access', true),
        false, false, now(), now()
      );
    else
      update auth.users
      set encrypted_password = crypt('unig1234', gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          confirmed_at = coalesce(confirmed_at, now()),
          updated_at = now()
      where id = target_user_id;
    end if;

    insert into auth.identities(
      id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at
    ) values (
      gen_random_uuid(), target_user_id,
      jsonb_build_object('sub', target_user_id::text, 'email', demo.email, 'email_verified', true),
      'email', target_user_id::text, now(), now(), now()
    ) on conflict (provider, provider_id) do update
      set identity_data = excluded.identity_data, updated_at = now();

    insert into public.profiles(id, email, full_name)
    values(target_user_id, demo.email, demo.full_name)
    on conflict (id) do update
      set email = excluded.email, full_name = excluded.full_name, updated_at = now();

    if not exists (
      select 1 from public.user_roles
      where user_id = target_user_id
        and organization_id = target_organization_id
        and role_id = target_role_id
        and is_active
    ) then
      insert into public.user_roles(user_id, organization_id, role_id, is_active)
      values(target_user_id, target_organization_id, target_role_id, true);
    end if;

    if target_clinic_id is not null then
      insert into public.user_clinic_scopes(user_role_id, clinic_id, revoked_at)
      select user_role.id, target_clinic_id, null
      from public.user_roles user_role
      where user_role.user_id = target_user_id
        and user_role.organization_id = target_organization_id
        and user_role.role_id = target_role_id
        and user_role.is_active
      on conflict (user_role_id, clinic_id) do update set revoked_at = null;
    end if;
  end loop;

  -- Cada conta de paciente é vinculada a uma pessoa/paciente da sua clínica.
  for demo in
    select * from (values
      ('patient-odonto@unig.demo', 'ODONTO', 'DEMO-001', 'PAC-ODONTO'),
      ('patient-fisio@unig.demo', 'FISIO', 'DEMO-002', 'PAC-FISIO'),
      ('patient-vet@unig.demo', 'VET', 'DEMO-003', 'PAC-VET'),
      ('patient-estetica@unig.demo', 'ESTETICA', 'DEMO-004', 'PAC-ESTETICA')
    ) as patients(email, clinic_code, document_number, record_number)
  loop
    select id into target_user_id from auth.users where email = demo.email;
    select id into target_clinic_id from public.clinics where organization_id = target_organization_id and code = demo.clinic_code and is_active limit 1;
    select id into target_person_id from public.persons where organization_id = target_organization_id and document_number = demo.document_number;
    if target_person_id is null then
      insert into public.persons(organization_id, full_name, document_number, email)
      values(target_organization_id, 'Paciente de teste ' || demo.clinic_code, demo.document_number, demo.email)
      returning id into target_person_id;
    end if;
    select id into target_patient_id from public.patients where organization_id = target_organization_id and person_id = target_person_id;
    if target_patient_id is null then
      insert into public.patients(organization_id, person_id, record_number)
      values(target_organization_id, target_person_id, demo.record_number)
      returning id into target_patient_id;
    end if;
    insert into public.patient_clinic_links(patient_id, clinic_id)
    values(target_patient_id, target_clinic_id)
    on conflict (patient_id, clinic_id) do nothing;
    update public.profiles set person_id = target_person_id, updated_at = now() where id = target_user_id;
  end loop;

  -- Tutor e animal de demonstração para o portal veterinário.
  select id into target_user_id from auth.users where email = 'tutor-vet@unig.demo';
  select id into target_clinic_id from public.clinics where organization_id = target_organization_id and code = 'VET' and is_active limit 1;
  select id into target_person_id from public.persons where organization_id = target_organization_id and document_number = 'DEMO-TUTOR-VET';
  if target_person_id is null then
    insert into public.persons(organization_id, full_name, document_number, email)
    values(target_organization_id, 'Tutor de teste veterinário', 'DEMO-TUTOR-VET', 'tutor-vet@unig.demo')
    returning id into target_person_id;
  end if;
  update public.profiles set person_id = target_person_id, updated_at = now() where id = target_user_id;
  select id into target_animal_id from public.animals where organization_id = target_organization_id and microchip_number = 'DEMO-THOR-VET';
  if target_animal_id is null then
    insert into public.animals(organization_id, name, species, breed, sex, microchip_number)
    values(target_organization_id, 'Thor — teste', 'Canino', 'Sem raça definida', 'male', 'DEMO-THOR-VET')
    returning id into target_animal_id;
  end if;
  insert into public.animal_guardians(animal_id, person_id, relationship, is_primary)
  values(target_animal_id, target_person_id, 'guardian', true)
  on conflict (animal_id, person_id) do update set is_primary = true;
end;
$block$;
