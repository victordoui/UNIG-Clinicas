ALTER TABLE public.organization_members
DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_role_check
CHECK (role = ANY (ARRAY[
  'organization_admin'::text,
  'administrador'::text,
  'coordenador_operacoes'::text,
  'gerente_geral'::text,
  'engenheira'::text,
  'validador_regulatorio'::text,
  'conselho'::text,
  'compras'::text,
  'almoxarifado'::text,
  'solicitante'::text,
  'visitante'::text,
  'gestor'::text,
  'patrimonio'::text
]));