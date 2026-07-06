-- Adicionar política RLS para super admins verem todos os perfis
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Garantir que a função is_super_admin existe e está acessível
COMMENT ON POLICY "Super admins can view all profiles" ON public.profiles IS 'Permite que super admins vejam todos os perfis de usuários';