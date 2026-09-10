-- Keep the original demo credentials safe while the clinic-specific accounts
-- become the preferred quick-access path.
insert into public.user_clinic_scopes (user_role_id, clinic_id, revoked_at)
select user_role.id, clinic.id, null
from auth.users demo_user
join public.user_roles user_role on user_role.user_id = demo_user.id and user_role.is_active
join public.roles role on role.id = user_role.role_id
join public.organizations organization on organization.id = user_role.organization_id
join public.clinics clinic on clinic.organization_id = organization.id and clinic.code = 'ODONTO'
where demo_user.email in (
  'clinic-manager@unig.demo',
  'clinician@unig.demo',
  'academic-supervisor@unig.demo',
  'student@unig.demo',
  'receptionist@unig.demo'
)
and role.code in ('clinic_manager', 'clinician', 'academic_supervisor', 'student', 'receptionist')
on conflict (user_role_id, clinic_id) do update set revoked_at = null;
