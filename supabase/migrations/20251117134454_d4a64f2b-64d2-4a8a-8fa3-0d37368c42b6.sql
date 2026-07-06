-- Adicionar campo para indicar se senha precisa ser alterada
ALTER TABLE public.profiles 
ADD COLUMN password_change_required BOOLEAN DEFAULT false;

-- Criar índice para performance
CREATE INDEX idx_profiles_password_change ON public.profiles(password_change_required) 
WHERE password_change_required = true;

-- Atualizar função get_current_user_role para usar organization_members
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Para super admins, retornar 'admin'
  SELECT CASE
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true 
    THEN 'admin'
    ELSE COALESCE(
      (SELECT role FROM public.organization_members 
       WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
      'usuario'
    )
  END::TEXT;
$$;