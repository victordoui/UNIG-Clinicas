-- Abordagem mais segura: Super admin deve poder ver todas as organizations sem depender de organization_members
-- E para verificar slug único, não precisamos de RLS complexa

-- Remover política problemática de organizations
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;

-- Política simples: Super admins veem tudo (já existe "Super admins can view all organizations")
-- Adicionar política que permite usuários verem suas organizações apenas usando JOIN direto
CREATE POLICY "Members can view their organization v2"
ON public.organizations FOR SELECT
USING (
  -- Super admin pode ver todas
  is_super_admin() = true
  OR
  -- Ou é membro ativo da organização
  id IN (
    SELECT om.organization_id 
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.is_active = true
  )
);