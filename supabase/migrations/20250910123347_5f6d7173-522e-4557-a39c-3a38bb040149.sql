-- Atualizar a função handle_new_user para usar 'usuario' ao invés de 'funcionario'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, status)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'usuario', 'pending');
  RETURN NEW;
END;
$$;

-- Atualizar todos os perfis existentes que têm 'funcionario' para 'usuario'
UPDATE public.profiles 
SET role = 'usuario' 
WHERE role = 'funcionario';

-- Configurar o usuário victordoui@gmail.com como administrador
-- Se o usuário existir na auth.users, atualizar o perfil
UPDATE public.profiles 
SET role = 'administrador', status = 'approved'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'victordoui@gmail.com'
);

-- Criar função para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar função para verificar se é admin ou gerente
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role IN ('administrador', 'gerente')
  )
$$;

-- Recriar as políticas usando as novas funções
DROP POLICY IF EXISTS "Admins can view all approval requests" ON public.user_approvals;
DROP POLICY IF EXISTS "Admins can update approval requests" ON public.user_approvals;

CREATE POLICY "Admins can view all approval requests" 
ON public.user_approvals 
FOR SELECT 
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can update approval requests" 
ON public.user_approvals 
FOR UPDATE 
USING (public.is_admin_or_manager(auth.uid()));