-- Criar enum para os níveis de acesso
CREATE TYPE public.app_role AS ENUM ('usuario', 'gerente', 'administrador');

-- Adicionar nova coluna com o tipo enum
ALTER TABLE public.profiles ADD COLUMN new_role public.app_role DEFAULT 'usuario'::public.app_role;

-- Migrar dados da coluna antiga para a nova
UPDATE public.profiles 
SET new_role = CASE 
  WHEN role = 'funcionario' THEN 'usuario'::public.app_role
  WHEN role = 'admin' THEN 'administrador'::public.app_role
  WHEN role = 'gerente' THEN 'gerente'::public.app_role
  ELSE 'usuario'::public.app_role
END;

-- Remover a coluna antiga
ALTER TABLE public.profiles DROP COLUMN role;

-- Renomear a nova coluna
ALTER TABLE public.profiles RENAME COLUMN new_role TO role;

-- Criar função para verificar roles (SECURITY DEFINER para evitar problemas de RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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
      AND role IN ('administrador'::public.app_role, 'gerente'::public.app_role)
  )
$$;

-- Criar função para obter o role do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Recriar as políticas usando as funções de segurança
CREATE POLICY "Admins can view all approval requests" 
ON public.user_approvals 
FOR SELECT 
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can update approval requests" 
ON public.user_approvals 
FOR UPDATE 
USING (public.is_admin_or_manager(auth.uid()));

-- Configurar o usuário victordoui@gmail.com como administrador
UPDATE public.profiles 
SET role = 'administrador'::public.app_role
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'victordoui@gmail.com'
);