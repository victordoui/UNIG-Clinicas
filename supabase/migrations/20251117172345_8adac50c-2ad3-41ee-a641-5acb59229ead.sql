-- =====================================================
-- RECREATE ORGANIZATIONS AND ORGANIZATION_MEMBERS TABLES
-- Step-by-step to avoid circular dependencies
-- =====================================================

-- 1. CREATE ORGANIZATIONS TABLE (without complex RLS policies)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'professional', 'enterprise')),
  max_users INTEGER DEFAULT 10 CHECK (max_users > 0),
  max_products INTEGER DEFAULT 1000 CHECK (max_products > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for organizations (without organization_members references)
CREATE POLICY "Super admins can view all organizations"
  ON public.organizations
  FOR SELECT
  USING (is_super_admin() = true);

CREATE POLICY "Super admins can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (is_super_admin() = true);

CREATE POLICY "Only super admins can delete organizations"
  ON public.organizations
  FOR DELETE
  USING (is_super_admin() = true);

-- Trigger for organizations updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. CREATE ORGANIZATION_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('organization_admin', 'manager', 'user')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(organization_id, user_id)
);

-- Create indexes for organization_members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_is_active ON public.organization_members(is_active);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_members
CREATE POLICY "Users can view their own membership"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all members"
  ON public.organization_members
  FOR SELECT
  USING (is_super_admin() = true);

CREATE POLICY "Admins and managers can view org members"
  ON public.organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('organization_admin', 'manager')
        AND is_active = true
    )
  );

CREATE POLICY "Super admins and org admins can add members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    is_super_admin() = true OR
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'organization_admin'
        AND is_active = true
    )
  );

CREATE POLICY "Super admins and org admins can update members"
  ON public.organization_members
  FOR UPDATE
  USING (
    is_super_admin() = true OR
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'organization_admin'
        AND is_active = true
    )
  );

CREATE POLICY "Super admins and org admins can delete members"
  ON public.organization_members
  FOR DELETE
  USING (
    is_super_admin() = true OR
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'organization_admin'
        AND is_active = true
    )
  );

-- Trigger for organization_members updated_at
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for logging membership actions
DROP TRIGGER IF EXISTS log_user_membership_action_trigger ON public.organization_members;
CREATE TRIGGER log_user_membership_action_trigger
  AFTER INSERT OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_membership_action();

-- 3. NOW ADD REMAINING POLICIES FOR ORGANIZATIONS
-- (These depend on organization_members existing)
-- =====================================================

CREATE POLICY "Members can view their organization"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Organization admins can update their organization"
  ON public.organizations
  FOR UPDATE
  USING (
    is_super_admin() = true OR
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'organization_admin' 
        AND is_active = true
    )
  );

-- 4. ENSURE FOREIGN KEYS EXIST ON RELATED TABLES
-- =====================================================

-- Add organization_id foreign keys with CASCADE if they don't exist
DO $$
BEGIN
  -- products table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_products_organization_id'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT fk_products_organization_id
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE;
  END IF;

  -- movements table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_movements_organization_id'
  ) THEN
    ALTER TABLE public.movements
    ADD CONSTRAINT fk_movements_organization_id
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE;
  END IF;

  -- alerts table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_alerts_organization_id'
  ) THEN
    ALTER TABLE public.alerts
    ADD CONSTRAINT fk_alerts_organization_id
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE;
  END IF;

  -- category_notifications table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_category_notifications_organization_id'
  ) THEN
    ALTER TABLE public.category_notifications
    ADD CONSTRAINT fk_category_notifications_organization_id
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE;
  END IF;
END $$;