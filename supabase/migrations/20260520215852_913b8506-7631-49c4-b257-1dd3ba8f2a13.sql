
-- Seed conselho M1..M5: papel base visitante + flag council_members
INSERT INTO public.organization_members (user_id, organization_id, role, is_active)
SELECT p.id, 'b3bf86a2-5856-4d8e-93b4-9388d126bab7'::uuid, 'visitante', true
FROM public.profiles p
WHERE p.email IN ('conselho1@teste.com','conselho2@teste.com','conselho3@teste.com','conselho4@teste.com','conselho5@teste.com')
ON CONFLICT (organization_id, user_id) DO UPDATE SET is_active = true;

INSERT INTO public.council_members (user_id, organization_id, ativo, nome_exibicao)
SELECT p.id, 'b3bf86a2-5856-4d8e-93b4-9388d126bab7'::uuid, true,
       upper('M' || substring(p.email from 'conselho([0-9]+)'))
FROM public.profiles p
WHERE p.email IN ('conselho1@teste.com','conselho2@teste.com','conselho3@teste.com','conselho4@teste.com','conselho5@teste.com')
ON CONFLICT (organization_id, user_id) DO UPDATE SET ativo = true, nome_exibicao = EXCLUDED.nome_exibicao;

-- Seed fornecedor de teste
INSERT INTO public.supplier_users (user_id, supplier_id, organization_id, is_active)
SELECT p.id, 'aa000001-0000-0000-0000-000000000001'::uuid,
       'b3bf86a2-5856-4d8e-93b4-9388d126bab7'::uuid, true
FROM public.profiles p WHERE p.email = 'fornecedor@teste.com'
ON CONFLICT (user_id, supplier_id) DO UPDATE SET is_active = true;
