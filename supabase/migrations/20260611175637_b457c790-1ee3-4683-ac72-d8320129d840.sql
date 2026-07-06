DO $$
DECLARE
  v_org uuid := 'b3bf86a2-5856-4d8e-93b4-9388d126bab7';
  v_users text[][] := ARRAY[
    ['odonto@teste.com','Solicitante Clínica de Odonto'],
    ['contabilidade@teste.com','Solicitante Contabilidade'],
    ['rh@teste.com','Solicitante RH']
  ];
  v_email text;
  v_name text;
  v_id uuid;
  i int;
BEGIN
  FOR i IN 1..array_length(v_users,1) LOOP
    v_email := v_users[i][1];
    v_name := v_users[i][2];

    SELECT id INTO v_id FROM auth.users WHERE email = v_email;
    IF v_id IS NULL THEN
      v_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        v_email, crypt('Teste@123', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_name),
        false
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
      VALUES (gen_random_uuid(), v_id,
        jsonb_build_object('sub', v_id::text, 'email', v_email),
        'email', v_email, now(), now(), now());
    END IF;

    INSERT INTO public.profiles (id, email, full_name, password_change_required)
    VALUES (v_id, v_email, v_name, false)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

    INSERT INTO public.organization_members (organization_id, user_id, role, is_active, joined_at)
    VALUES (v_org, v_id, 'solicitante', true, now())
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;