-- Criar política RLS para permitir que usuários da organização atualizem estoque de produtos
CREATE POLICY "Users can update product stock in their organization"
ON public.products
FOR UPDATE
TO authenticated
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());