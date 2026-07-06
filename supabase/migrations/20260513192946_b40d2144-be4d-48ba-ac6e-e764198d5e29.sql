DO $$
DECLARE
  test_emails TEXT[] := ARRAY['almox@teste.com', 'compras@teste.com', 'admin@teste.com'];
  test_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO test_ids FROM auth.users WHERE email = ANY(test_emails);

  IF test_ids IS NOT NULL THEN
    DELETE FROM public.organization_members WHERE user_id = ANY(test_ids);
    DELETE FROM public.profiles WHERE id = ANY(test_ids);
    DELETE FROM auth.identities WHERE user_id = ANY(test_ids);
    DELETE FROM auth.users WHERE id = ANY(test_ids);
  END IF;
END $$;