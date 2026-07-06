-- Remover constraint antiga sem ON DELETE CASCADE
ALTER TABLE public.security_audit_log 
DROP CONSTRAINT IF EXISTS security_audit_log_organization_id_fkey;

-- Recriar constraint com ON DELETE CASCADE
ALTER TABLE public.security_audit_log 
ADD CONSTRAINT security_audit_log_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES public.organizations(id) 
ON DELETE CASCADE;