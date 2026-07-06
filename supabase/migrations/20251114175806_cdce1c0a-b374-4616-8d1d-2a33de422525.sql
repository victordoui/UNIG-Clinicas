-- =====================================================
-- FASE 2: Migração de Dados Existentes (Sem triggers)
-- =====================================================

-- Remover triggers problemáticos primeiro
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;

-- 2.1 Criar organização UNIG (se não existir)
INSERT INTO public.organizations (name, slug, is_active, subscription_plan, max_users, max_products, created_by)
SELECT 'UNIG', 'unig', true, 'enterprise', 50, 10000, '95820bf6-0aa5-43ac-93fc-1f342d680532'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'unig');

-- 2.2 Marcar Victor como super admin
UPDATE public.profiles 
SET is_super_admin = true 
WHERE email = 'victordoui@gmail.com';

-- 2.3 Associar todos os usuários existentes à UNIG (apenas usuários válidos em auth.users)
INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
SELECT 
  o.id as organization_id,
  p.id as user_id,
  CASE 
    WHEN p.role = 'admin' THEN 'organization_admin'
    WHEN p.role = 'gerente' THEN 'manager'
    ELSE 'user'
  END as role,
  true as is_active
FROM public.profiles p
CROSS JOIN public.organizations o
WHERE o.slug = 'unig'
  AND p.is_super_admin = false
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.user_id = p.id AND om.organization_id = o.id
  );

-- 2.4 Associar produtos existentes à UNIG
UPDATE public.products 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'unig')
WHERE organization_id IS NULL;

-- 2.5 Associar movimentações existentes à UNIG
UPDATE public.movements 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'unig')
WHERE organization_id IS NULL;

-- 2.6 Associar alertas existentes à UNIG
UPDATE public.alerts 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'unig')
WHERE organization_id IS NULL;

-- 2.7 Associar notificações de categoria existentes à UNIG
UPDATE public.category_notifications 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'unig')
WHERE organization_id IS NULL;

-- 2.8 Recriar triggers corretamente
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();