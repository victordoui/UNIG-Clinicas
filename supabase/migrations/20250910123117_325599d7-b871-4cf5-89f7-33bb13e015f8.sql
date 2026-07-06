-- Criar enum para os níveis de acesso
CREATE TYPE public.app_role AS ENUM ('usuario', 'gerente', 'administrador');

-- Atualizar a tabela profiles para usar o novo enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.app_role 
USING role::public.app_role;

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

-- Atualizar o usuário victordoui@gmail.com para administrador
-- Primeiro precisamos encontrar o user_id baseado no email
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Buscar o user_id pelo email no auth.users
    SELECT id INTO target_user_id
    FROM auth.users 
    WHERE email = 'victordoui@gmail.com';
    
    -- Se encontrou o usuário, atualizar o role
    IF target_user_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET role = 'administrador'::public.app_role
        WHERE user_id = target_user_id;
        
        -- Se não existe perfil, criar um
        IF NOT FOUND THEN
            INSERT INTO public.profiles (user_id, role, status)
            VALUES (target_user_id, 'administrador'::public.app_role, 'approved');
        END IF;
        
        RAISE NOTICE 'Usuário victordoui@gmail.com configurado como administrador';
    ELSE
        RAISE NOTICE 'Usuário victordoui@gmail.com não encontrado na tabela auth.users';
    END IF;
END $$;