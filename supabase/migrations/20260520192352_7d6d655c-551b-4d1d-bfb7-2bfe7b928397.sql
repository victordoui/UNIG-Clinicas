INSERT INTO public.organization_members (user_id, organization_id, role, is_active)
SELECT id, 'b3bf86a2-5856-4d8e-93b4-9388d126bab7'::uuid, 'solicitante', true
FROM public.profiles
WHERE email = 'solicitante@teste.com'
ON CONFLICT DO NOTHING;