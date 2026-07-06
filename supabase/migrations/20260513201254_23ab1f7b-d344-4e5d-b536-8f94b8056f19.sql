INSERT INTO public.organization_members (organization_id, user_id, role, is_active, invited_by, joined_at) VALUES
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7','baf2cc34-daca-4906-8a35-85973366e4ad','organization_admin',true,'a7f898f2-6dc8-419c-95dc-676c6579163b',now()),
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7','869200f9-d76b-439a-84cf-4d63f9267f18','compras',true,'a7f898f2-6dc8-419c-95dc-676c6579163b',now()),
  ('b3bf86a2-5856-4d8e-93b4-9388d126bab7','85cc7167-92ec-48bd-a510-e089b3eb5820','almoxarifado',true,'a7f898f2-6dc8-419c-95dc-676c6579163b',now())
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = true;