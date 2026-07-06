-- Remover a política que ainda causa recursão
DROP POLICY IF EXISTS "Active members can view org members" ON public.organization_members;

-- A política de "Members can view their organization" também pode estar causando problema
-- Vamos simplificá-la também
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;

-- Criar política simplificada para organizations que não depende de subquery
CREATE POLICY "Members can view their organization"
ON public.organizations FOR SELECT
USING (
  is_super_admin() = true
  OR
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organizations.id
    AND om.user_id = auth.uid()
    AND om.is_active = true
  )
);