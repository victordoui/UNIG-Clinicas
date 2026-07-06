ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;

UPDATE public.organization_members SET role = 'visitante' WHERE role IN ('visualizador', 'user');
UPDATE public.organization_members SET role = 'administrador' WHERE role IN ('gestor_aprovador', 'manager');

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('organization_admin','administrador','compras','almoxarifado','solicitante','visitante'));