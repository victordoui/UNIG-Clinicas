-- FASE 2: Reestruturação Simplificada do Banco de Dados

-- 2.1. Criar novo enum para roles de organização
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_role') THEN
    CREATE TYPE organization_role AS ENUM (
      'organization_admin',
      'manager',
      'user'
    );
  END IF;
END $$;

-- 2.2. Atualizar função get_current_user_role para nova estrutura
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true 
    THEN 'admin'
    ELSE COALESCE(
      (SELECT 
        CASE role
          WHEN 'organization_admin' THEN 'admin'
          WHEN 'manager' THEN 'gerente'
          WHEN 'user' THEN 'usuario'
          ELSE 'usuario'
        END
       FROM public.organization_members 
       WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
      'usuario'
    )
  END::TEXT;
$function$;

-- 2.3. Remover policies que dependem da coluna role
DROP POLICY IF EXISTS "Only admins can update user roles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile data" ON profiles;

-- 2.4. Remover coluna role da tabela profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- 2.5. Recriar policies em profiles (sem usar a coluna role)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Only admins can update user profiles'
  ) THEN
    CREATE POLICY "Only admins can update user profiles"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (get_current_user_role() = 'admin');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Authenticated users can update own basic profile data'
  ) THEN
    CREATE POLICY "Authenticated users can update own basic profile data"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2.6. Remover enum user_role
DROP TYPE IF EXISTS user_role CASCADE;