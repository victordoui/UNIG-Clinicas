-- Adicionar políticas RLS para Super Admins gerenciarem organization_invitations

-- Política para Super Admins inserirem convites em qualquer organização
CREATE POLICY "Super admins can insert invitations"
ON public.organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (check_is_super_admin());

-- Política para Super Admins atualizarem convites em qualquer organização
CREATE POLICY "Super admins can update invitations"
ON public.organization_invitations
FOR UPDATE
TO authenticated
USING (check_is_super_admin());

-- Política para Super Admins deletarem convites em qualquer organização
CREATE POLICY "Super admins can delete invitations"
ON public.organization_invitations
FOR DELETE
TO authenticated
USING (check_is_super_admin());

-- Corrigir política existente de Organization Admins para incluir WITH CHECK
DROP POLICY IF EXISTS "Organization admins can manage invitations" ON public.organization_invitations;

CREATE POLICY "Organization admins can manage invitations"
ON public.organization_invitations
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_members.organization_id
    FROM organization_members
    WHERE organization_members.user_id = auth.uid()
      AND organization_members.role = 'organization_admin'
      AND organization_members.is_active = true
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_members.organization_id
    FROM organization_members
    WHERE organization_members.user_id = auth.uid()
      AND organization_members.role = 'organization_admin'
      AND organization_members.is_active = true
  )
);