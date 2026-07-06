-- Primeiro, remover todas as políticas que possam depender da coluna role
DROP POLICY IF EXISTS "Admins can view all approval requests" ON public.user_approvals;
DROP POLICY IF EXISTS "Admins can update approval requests" ON public.user_approvals;

-- Remover o valor padrão da coluna role
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Criar enum para os níveis de acesso
CREATE TYPE public.app_role AS ENUM ('usuario', 'gerente', 'administrador');

-- Atualizar a tabela profiles para usar o novo enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role 
USING CASE 
  WHEN role::text = 'funcionario' THEN 'usuario'::public.app_role
  WHEN role::text = 'admin' THEN 'administrador'::public.app_role
  WHEN role::text = 'gerente' THEN 'gerente'::public.app_role
  ELSE 'usuario'::public.app_role
END;

-- Definir o valor padrão como 'usuario'
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'usuario'::public.app_role;

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