-- 1. Criar função auxiliar SECURITY DEFINER que evita recursão
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT COALESCE(is_super_admin, false) INTO is_admin
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- 2. Remover política problemática que causa recursão
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- 3. Recriar política usando a função SECURITY DEFINER
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (check_is_super_admin());

-- 4. Adicionar política específica para organization_members
DROP POLICY IF EXISTS "Super admins can view all organization members" ON public.organization_members;

CREATE POLICY "Super admins can view all organization members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (check_is_super_admin());