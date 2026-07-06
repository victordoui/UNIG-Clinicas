-- Drop existing foreign keys and recreate with ON DELETE CASCADE

-- Products table
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_organization_id_fkey;

ALTER TABLE public.products
ADD CONSTRAINT products_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Movements table
ALTER TABLE public.movements
DROP CONSTRAINT IF EXISTS movements_organization_id_fkey;

ALTER TABLE public.movements
ADD CONSTRAINT movements_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Subscription invoices table
ALTER TABLE public.subscription_invoices
DROP CONSTRAINT IF EXISTS subscription_invoices_organization_id_fkey;

ALTER TABLE public.subscription_invoices
ADD CONSTRAINT subscription_invoices_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Alerts table
ALTER TABLE public.alerts
DROP CONSTRAINT IF EXISTS alerts_organization_id_fkey;

ALTER TABLE public.alerts
ADD CONSTRAINT alerts_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Organization members table
ALTER TABLE public.organization_members
DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;

ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Organization invitations table
ALTER TABLE public.organization_invitations
DROP CONSTRAINT IF EXISTS organization_invitations_organization_id_fkey;

ALTER TABLE public.organization_invitations
ADD CONSTRAINT organization_invitations_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Category notifications table
ALTER TABLE public.category_notifications
DROP CONSTRAINT IF EXISTS category_notifications_organization_id_fkey;

ALTER TABLE public.category_notifications
ADD CONSTRAINT category_notifications_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;

-- Security audit log table
ALTER TABLE public.security_audit_log
DROP CONSTRAINT IF EXISTS security_audit_log_organization_id_fkey;

ALTER TABLE public.security_audit_log
ADD CONSTRAINT security_audit_log_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;