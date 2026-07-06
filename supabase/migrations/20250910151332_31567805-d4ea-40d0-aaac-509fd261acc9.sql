-- Fix profile mismatch for victordoui@gmail.com
-- Insert correct profile for the authenticated user
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('95820bf6-0aa5-43ac-93fc-1f342d680532', 'victordoui@gmail.com', 'Victor Souza', 'admin')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Clean up the old incorrect profile
DELETE FROM public.profiles WHERE id = '181e1c43-b2d8-47af-838f-56891c3affd1';