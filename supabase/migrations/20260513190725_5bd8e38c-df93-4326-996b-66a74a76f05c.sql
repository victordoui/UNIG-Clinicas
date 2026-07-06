
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role = ANY (ARRAY[
    'organization_admin','manager','user',
    'almoxarifado','compras','gestor_aprovador','solicitante','visualizador'
  ]));

DO $$
DECLARE
  v_org uuid := 'b3bf86a2-5856-4d8e-93b4-9388d126bab7';
  v_pwd text := crypt('Teste@123', gen_salt('bf'));
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('11111111-1111-1111-1111-111111111111'::uuid, 'almox@teste.com',   'Almoxarifado Teste', 'almoxarifado'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'compras@teste.com', 'Compras Teste',      'compras'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'admin@teste.com',   'Admin Teste',        'organization_admin')
    ) AS t(uid, email, full_name, role)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', rec.uid, 'authenticated', 'authenticated',
      rec.email, v_pwd, NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', rec.full_name),
      false, false
    )
    ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = NOW(),
      updated_at = NOW();

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at
    )
    VALUES (
      gen_random_uuid(), rec.uid,
      jsonb_build_object('sub', rec.uid::text, 'email', rec.email, 'email_verified', true),
      'email', rec.uid::text, NOW(), NOW(), NOW()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, is_super_admin, password_change_required)
    VALUES (rec.uid, rec.email, rec.full_name, false, false)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      password_change_required = false;

    INSERT INTO public.organization_members (organization_id, user_id, role, is_active, joined_at)
    VALUES (v_org, rec.uid, rec.role, true, NOW())
    ON CONFLICT (organization_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      is_active = true;
  END LOOP;
END $$;
