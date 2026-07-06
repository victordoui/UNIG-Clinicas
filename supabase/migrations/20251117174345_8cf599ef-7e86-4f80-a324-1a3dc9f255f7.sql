-- Criar função helper para verificar se usuário é admin da organização
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role = 'organization_admin'
    AND is_active = true
  );
END;
$$;

-- Remover políticas problemáticas de organization_members que causam recursão
DROP POLICY IF EXISTS "Admins and managers can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Super admins and org admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Super admins and org admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Super admins and org admins can delete members" ON public.organization_members;

-- Criar novas políticas simplificadas para SELECT
-- Super admins podem ver todos os membros (já existe)
-- Política "Super admins can view all members" já existe

-- Membros ativos podem ver outros membros da mesma organização
CREATE POLICY "Active members can view org members"
ON public.organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = organization_members.organization_id
    AND om.is_active = true
  )
);

-- Criar políticas para INSERT usando função helper
CREATE POLICY "Super admins can insert members"
ON public.organization_members FOR INSERT
WITH CHECK (is_super_admin() = true);

CREATE POLICY "Org admins can insert org members"
ON public.organization_members FOR INSERT
WITH CHECK (public.is_org_admin(organization_id));

-- Criar políticas para UPDATE usando função helper
CREATE POLICY "Super admins can update members"
ON public.organization_members FOR UPDATE
USING (is_super_admin() = true);

CREATE POLICY "Org admins can update org members"
ON public.organization_members FOR UPDATE
USING (public.is_org_admin(organization_id));

-- Criar políticas para DELETE usando função helper
CREATE POLICY "Super admins can delete members"
ON public.organization_members FOR DELETE
USING (is_super_admin() = true);

CREATE POLICY "Org admins can delete org members"
ON public.organization_members FOR DELETE
USING (public.is_org_admin(organization_id));