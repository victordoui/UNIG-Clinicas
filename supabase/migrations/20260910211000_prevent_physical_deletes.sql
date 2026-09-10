drop policy if exists organizations_delete_manage on public.organizations;
drop policy if exists units_delete_manage on public.units;
drop policy if exists clinics_delete_manage on public.clinics;
drop policy if exists clinic_services_delete_manage on public.clinic_services;
drop policy if exists user_roles_delete_manage on public.user_roles;
drop policy if exists user_clinic_scopes_delete_manage on public.user_clinic_scopes;
revoke delete on table public.organizations,public.units,public.clinics,public.clinic_services,public.profiles,public.user_roles,public.user_clinic_scopes,public.persons,public.patients,public.animals,public.animal_guardians,public.appointments,public.queue_sessions,public.queue_tickets,public.encounters,public.clinical_records,public.clinical_notes,public.clinical_note_versions,public.clinical_procedures,public.exam_orders,public.consents,public.documents,public.student_supervisions,public.evaluations,public.organization_settings,public.audit_logs,public.roles,public.permissions,public.role_permissions from authenticated,anon;
