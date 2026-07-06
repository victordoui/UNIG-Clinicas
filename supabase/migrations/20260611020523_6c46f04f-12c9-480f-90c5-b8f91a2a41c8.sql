DO $$
DECLARE
  v_org_id uuid := 'b3bf86a2-5856-4d8e-93b4-9388d126bab7';
  v_users jsonb := '[
    {"id":"44444444-4444-4444-4444-444444444444","email":"comprador1@teste.com","name":"Emerson (Comprador 1)"},
    {"id":"55555555-5555-5555-5555-555555555555","email":"comprador2@teste.com","name":"Renilson (Comprador 2)"},
    {"id":"66666666-6666-6666-6666-666666666666","email":"comprador3@teste.com","name":"Leonardo (Comprador 3)"}
  ]'::jsonb;
  u jsonb;
  v_uid uuid;
  v_email text;
  v_name text;
BEGIN
  FOR u IN SELECT * FROM jsonb_array_elements(v_users) LOOP
    v_uid := (u->>'id')::uuid;
    v_email := u->>'email';
    v_name := u->>'name';

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt('Teste@123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_name),
      now(), now(), '', '', '', '', false
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_uid::text, v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, password_change_required, is_super_admin)
    VALUES (v_uid, v_email, v_name, false, false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
    VALUES (v_org_id, v_uid, 'compras', true)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'compras', is_active = true;
  END LOOP;
END $$;