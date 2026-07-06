ALTER TABLE public.organization_members
  DROP CONSTRAINT organization_members_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role = ANY (ARRAY[
    'organization_admin','administrador','coordenador_operacoes',
    'gerente_geral','engenheira','validador_regulatorio','conselho',
    'compras','almoxarifado','solicitante','visitante'
  ]));