-- Migração de Dados para UNIG
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Inserir UNIG se não existir
  INSERT INTO public.organizations (name, slug, is_active, subscription_plan, max_users, max_products, created_by)
  SELECT 'UNIG', 'unig', true, 'enterprise', 50, 10000, '95820bf6-0aa5-43ac-93fc-1f342d680532'
  WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'unig')
  RETURNING id INTO v_org_id;
  
  -- Se não inseriu, pegar o id existente
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'unig';
  END IF;

  -- Marcar Victor como super admin
  UPDATE public.profiles 
  SET is_super_admin = true 
  WHERE email = 'victordoui@gmail.com';

  -- Associar usuários à UNIG
  INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
  SELECT 
    v_org_id,
    p.id,
    CASE 
      WHEN p.role = 'admin' THEN 'organization_admin'
      WHEN p.role = 'gerente' THEN 'manager'
      ELSE 'user'
    END,
    true
  FROM public.profiles p
  WHERE p.is_super_admin = false
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.user_id = p.id AND om.organization_id = v_org_id
    );

  -- Associar produtos, movimentações, alertas e notificações à UNIG
  UPDATE public.products SET organization_id = v_org_id WHERE organization_id IS NULL;
  UPDATE public.movements SET organization_id = v_org_id WHERE organization_id IS NULL;
  UPDATE public.alerts SET organization_id = v_org_id WHERE organization_id IS NULL;
  UPDATE public.category_notifications SET organization_id = v_org_id WHERE organization_id IS NULL;
END $$;