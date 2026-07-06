-- Visualizar as restrições da tabela profiles
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public' 
AND constraint_name LIKE '%profiles%';

-- Remover temporariamente restrições de check para atualizar os dados
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Atualizar todos os perfis 'funcionario' para 'usuario'
UPDATE public.profiles 
SET role = 'usuario' 
WHERE role = 'funcionario';

-- Configurar o usuário victordoui@gmail.com como administrador
UPDATE public.profiles 
SET role = 'administrador', status = 'approved'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'victordoui@gmail.com'
);

-- Criar nova restrição de check com os valores corretos
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('usuario', 'gerente', 'administrador'));

-- Atualizar a função handle_new_user
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