-- The auditor quick-access role must be able to view the audit trail exposed
-- by the administration route. This is additive and idempotent.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code = 'audit.read'
where r.code = 'auditor'
on conflict do nothing;
