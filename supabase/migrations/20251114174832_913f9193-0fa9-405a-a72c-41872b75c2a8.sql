-- =====================================================
-- FASE 1: Estrutura Multi-Tenant VStock
-- =====================================================

-- 1.1 Criar Tabela de Organizações/Empresas
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'basic',
  max_users INTEGER DEFAULT 10,
  max_products INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_is_active ON public.organizations(is_active);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 1.2 Criar Tabela de Membros da Organização
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('organization_admin', 'manager', 'user')),
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, user_id)
);

-- Índices
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_role ON public.organization_members(role);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 1.3 Adicionar Campo Super Admin na Tabela Profiles
ALTER TABLE public.profiles 
ADD COLUMN is_super_admin BOOLEAN DEFAULT false;

-- 1.4 Adicionar organization_id nas Tabelas Existentes
ALTER TABLE public.products 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_products_organization_id ON public.products(organization_id);

ALTER TABLE public.movements 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_movements_organization_id ON public.movements(organization_id);

ALTER TABLE public.alerts 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_alerts_organization_id ON public.alerts(organization_id);

ALTER TABLE public.category_notifications 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_category_notifications_organization_id ON public.category_notifications(organization_id);

-- 1.5 Criar Funções de Segurança
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = auth.uid() 
  AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_super_admin, false) 
  FROM public.profiles 
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_organization_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.organization_members 
  WHERE user_id = auth.uid() 
  AND is_active = true
  LIMIT 1;
$$;

-- 1.6 Trigger para atualizar updated_at em organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.7 Trigger para atualizar updated_at em organization_members
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.8 RLS Policies para Organizations
CREATE POLICY "Super admin can view all organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Members can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Super admin can insert organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (is_super_admin() = true);

CREATE POLICY "Admins can update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  is_super_admin() = true OR
  (id = get_user_organization_id() AND get_organization_role() = 'organization_admin')
);

CREATE POLICY "Super admin can delete organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (is_super_admin() = true);

-- 1.9 RLS Policies para Organization Members
CREATE POLICY "Users can view own membership"
ON public.organization_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admin can view all memberships"
ON public.organization_members FOR SELECT
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Organization admins can view their org members"
ON public.organization_members FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND 
  get_organization_role() IN ('organization_admin', 'manager')
);

CREATE POLICY "Super admin can insert members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (is_super_admin() = true);

CREATE POLICY "Organization admins can invite members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id() AND 
  get_organization_role() = 'organization_admin'
);

CREATE POLICY "Super admin can update members"
ON public.organization_members FOR UPDATE
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Organization admins can update their org members"
ON public.organization_members FOR UPDATE
TO authenticated
USING (
  organization_id = get_user_organization_id() AND 
  get_organization_role() = 'organization_admin'
);

CREATE POLICY "Super admin can delete members"
ON public.organization_members FOR DELETE
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Organization admins can remove members"
ON public.organization_members FOR DELETE
TO authenticated
USING (
  organization_id = get_user_organization_id() AND 
  get_organization_role() = 'organization_admin'
);

-- 1.10 Atualizar RLS Policies para Products (adicionar filtro por organização)
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;

CREATE POLICY "Users can view organization products"
ON public.products FOR SELECT
TO authenticated
USING (
  is_super_admin() = true OR
  organization_id = get_user_organization_id()
);

CREATE POLICY "Users can insert organization products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id() AND
  created_by = auth.uid()
);

-- 1.11 Atualizar RLS Policies para Movements (adicionar filtro por organização)
DROP POLICY IF EXISTS "Authenticated users can view movements" ON public.movements;
DROP POLICY IF EXISTS "Authenticated users can insert movements" ON public.movements;

CREATE POLICY "Users can view organization movements"
ON public.movements FOR SELECT
TO authenticated
USING (
  is_super_admin() = true OR
  organization_id = get_user_organization_id()
);

CREATE POLICY "Users can insert organization movements"
ON public.movements FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id() AND
  created_by = auth.uid()
);

-- 1.12 Atualizar RLS Policies para Alerts (adicionar filtro por organização)
DROP POLICY IF EXISTS "Only admins and managers can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Only admins and managers can insert alerts" ON public.alerts;

CREATE POLICY "Admins can view organization alerts"
ON public.alerts FOR SELECT
TO authenticated
USING (
  is_super_admin() = true OR
  (organization_id = get_user_organization_id() AND 
   get_current_user_role() IN ('admin', 'gerente'))
);

CREATE POLICY "Admins can insert organization alerts"
ON public.alerts FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id() AND
  get_current_user_role() IN ('admin', 'gerente')
);

-- 1.13 Atualizar RLS Policies para Category Notifications
DROP POLICY IF EXISTS "Authenticated users can view own category notifications" ON public.category_notifications;
DROP POLICY IF EXISTS "Authenticated users can manage own category notifications" ON public.category_notifications;

CREATE POLICY "Users can view own org category notifications"
ON public.category_notifications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() AND
  (organization_id = get_user_organization_id() OR is_super_admin() = true)
);

CREATE POLICY "Users can manage own org category notifications"
ON public.category_notifications FOR ALL
TO authenticated
USING (
  user_id = auth.uid() AND
  organization_id = get_user_organization_id()
)
WITH CHECK (
  user_id = auth.uid() AND
  organization_id = get_user_organization_id()
);