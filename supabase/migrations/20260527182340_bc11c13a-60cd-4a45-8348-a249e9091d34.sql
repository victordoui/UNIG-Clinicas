
-- Extend supplier_status enum with new pre-approval statuses
DO $$ BEGIN
  ALTER TYPE public.supplier_status ADD VALUE IF NOT EXISTS 'convidado';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.supplier_status ADD VALUE IF NOT EXISTS 'acesso_criado';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.supplier_status ADD VALUE IF NOT EXISTS 'cadastro_incompleto';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Invitation status enum
DO $$ BEGIN
  CREATE TYPE public.supplier_invitation_status AS ENUM ('pendente','usado','expirado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Manual access override on suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS acesso_liberado_manual boolean NOT NULL DEFAULT false;

-- supplier_invitations table
CREATE TABLE IF NOT EXISTS public.supplier_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  email text NOT NULL,
  nome_empresa text,
  cnpj text,
  tipo_fornecedor text NOT NULL DEFAULT 'produto',
  categoria_esperada text,
  observacao_interna text,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  status public.supplier_invitation_status NOT NULL DEFAULT 'pendente',
  used_at timestamptz,
  used_by_user_id uuid,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_invitations TO authenticated;
GRANT ALL ON public.supplier_invitations TO service_role;

CREATE INDEX IF NOT EXISTS idx_supplier_invitations_token ON public.supplier_invitations(token);
CREATE INDEX IF NOT EXISTS idx_supplier_invitations_email ON public.supplier_invitations(email);
CREATE INDEX IF NOT EXISTS idx_supplier_invitations_status ON public.supplier_invitations(status);
CREATE INDEX IF NOT EXISTS idx_supplier_invitations_org ON public.supplier_invitations(organization_id);

ALTER TABLE public.supplier_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_invitations admin select"
  ON public.supplier_invitations FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "supplier_invitations admin insert"
  ON public.supplier_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "supplier_invitations admin update"
  ON public.supplier_invitations FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "supplier_invitations admin delete"
  ON public.supplier_invitations FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE TRIGGER trg_supplier_invitations_updated
  BEFORE UPDATE ON public.supplier_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
