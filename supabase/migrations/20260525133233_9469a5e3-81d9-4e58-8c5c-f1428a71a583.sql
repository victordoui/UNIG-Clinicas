
-- 0) Allow new roles in the check constraint
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check
  CHECK (role = ANY (ARRAY[
    'organization_admin','administrador','compras','almoxarifado','solicitante','visitante',
    'coordenador_operacoes','gerente_geral','engenheira'
  ]));

-- 1) Seed 3 new test users
DO $$
DECLARE
  v_org uuid := 'b3bf86a2-5856-4d8e-93b4-9388d126bab7';
  v_id  uuid;
  v_user record;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('coord.operacoes@teste.com', 'Coordenador de Operações', 'coordenador_operacoes'),
      ('gerente.geral@teste.com',   'Gerente Geral',            'gerente_geral'),
      ('engenheira@teste.com',      'Engenheira',               'engenheira')
    ) AS t(email, full_name, role)
  LOOP
    SELECT id INTO v_id FROM auth.users WHERE email = v_user.email;
    IF v_id IS NULL THEN
      v_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        v_user.email, crypt('Teste@123', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_user.full_name),
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), v_id, jsonb_build_object('sub', v_id::text, 'email', v_user.email), 'email', v_id::text, now(), now(), now());
    END IF;

    INSERT INTO public.profiles (id, email, full_name, is_super_admin, password_change_required, created_at, updated_at)
    VALUES (v_id, v_user.email, v_user.full_name, false, false, now(), now())
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

    INSERT INTO public.organization_members (organization_id, user_id, role, is_active, created_at)
    VALUES (v_org, v_id, v_user.role, true, now())
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = true;
  END LOOP;
END $$;

-- 2) Remove old council members
DELETE FROM public.council_members
WHERE id IN (
  'b86b4679-da36-4ad9-8a3f-80b3564fbd0e',
  '58705079-5e40-4b4f-870e-065789af1489',
  'f4c5b010-f529-45c7-83b8-c91077eafcc8',
  '25a81f7e-c7c2-4c4d-9954-4a7ecc17361b',
  'fd958503-afc5-4306-af1d-d2b75a0c9b81'
);

-- 3) Activate conselho1..5 as council M1..M5
INSERT INTO public.council_members (organization_id, user_id, nome_exibicao, ativo, created_at)
VALUES
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7', '9fec6839-ca3c-4830-ae0f-365230837e0a', 'Conselho M1', true, now()),
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7', '5a811e62-d85f-4a92-b162-84d8a496f11b', 'Conselho M2', true, now()),
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7', 'a96b2d43-ec55-46b5-a681-53dc1decf124', 'Conselho M3', true, now()),
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7', 'f08dd7f7-c709-4240-a987-80ea1c769a4d', 'Conselho M4', true, now()),
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7', '27219153-20ad-4f5f-93bd-bd35c2a2d040', 'Conselho M5', true, now())
ON CONFLICT DO NOTHING;
