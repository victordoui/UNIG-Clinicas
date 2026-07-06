-- Tabela para gerenciar convites de membros para organizações
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('organization_admin', 'manager', 'member')),
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

-- Índices para performance (criar apenas se não existirem)
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.organization_invitations(token);

-- RLS policies
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Super admins podem ver todos os convites
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_invitations' 
    AND policyname = 'Super admins can view all invitations'
  ) THEN
    CREATE POLICY "Super admins can view all invitations"
      ON public.organization_invitations FOR SELECT
      TO authenticated
      USING (public.is_super_admin());
  END IF;

  -- Admins da organização podem gerenciar convites
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_invitations' 
    AND policyname = 'Organization admins can manage invitations'
  ) THEN
    CREATE POLICY "Organization admins can manage invitations"
      ON public.organization_invitations FOR ALL
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid() 
          AND role = 'organization_admin'
          AND is_active = true
        )
      );
  END IF;
END $$;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.organization_invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para histórico de faturas
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  subscription_plan TEXT NOT NULL,
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.subscription_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.subscription_invoices(billing_period_start DESC);

-- RLS
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Super admins podem ver todas as faturas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_invoices' 
    AND policyname = 'Super admins can view all invoices'
  ) THEN
    CREATE POLICY "Super admins can view all invoices"
      ON public.subscription_invoices FOR SELECT
      TO authenticated
      USING (public.is_super_admin());
  END IF;

  -- Admins da organização podem ver suas faturas
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_invoices' 
    AND policyname = 'Organization admins can view their invoices'
  ) THEN
    CREATE POLICY "Organization admins can view their invoices"
      ON public.subscription_invoices FOR SELECT
      TO authenticated
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid() 
          AND role = 'organization_admin'
          AND is_active = true
        )
      );
  END IF;
END $$;

-- Trigger
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.subscription_invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar foreign key entre organization_members e profiles se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Função para aceitar convite e criar membro
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(
  invitation_token UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Buscar convite
  SELECT * INTO v_invitation
  FROM public.organization_invitations
  WHERE token = invitation_token
  AND accepted_at IS NULL
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Pegar ID do usuário atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Verificar se email do convite corresponde ao email do usuário
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_user_id 
    AND email = v_invitation.email
  ) THEN
    RAISE EXCEPTION 'Email mismatch';
  END IF;
  
  -- Criar membro da organização
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    is_active,
    invited_by,
    joined_at
  ) VALUES (
    v_invitation.organization_id,
    v_user_id,
    v_invitation.role,
    true,
    v_invitation.invited_by,
    now()
  )
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET
    is_active = true,
    role = EXCLUDED.role,
    joined_at = now();
  
  -- Marcar convite como aceito
  UPDATE public.organization_invitations
  SET accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role
  );
  
  RETURN v_result;
END;
$$;

-- Popular faturas de exemplo para a organização UNIG
INSERT INTO public.subscription_invoices (
  organization_id,
  invoice_number,
  amount,
  currency,
  status,
  billing_period_start,
  billing_period_end,
  due_date,
  paid_at,
  payment_method,
  subscription_plan,
  notes
) VALUES
  (
    '0971e01b-4103-4957-9d1a-5aef3a4111b0',
    'INV-2025-001',
    499.90,
    'BRL',
    'paid',
    '2025-01-01',
    '2025-01-31',
    '2025-01-10',
    '2025-01-08 10:30:00',
    'credit_card',
    'enterprise',
    'Fatura de janeiro de 2025'
  ),
  (
    '0971e01b-4103-4957-9d1a-5aef3a4111b0',
    'INV-2025-002',
    499.90,
    'BRL',
    'paid',
    '2025-02-01',
    '2025-02-28',
    '2025-02-10',
    '2025-02-07 14:20:00',
    'credit_card',
    'enterprise',
    'Fatura de fevereiro de 2025'
  ),
  (
    '0971e01b-4103-4957-9d1a-5aef3a4111b0',
    'INV-2025-003',
    499.90,
    'BRL',
    'paid',
    '2025-03-01',
    '2025-03-31',
    '2025-03-10',
    '2025-03-09 09:15:00',
    'credit_card',
    'enterprise',
    'Fatura de março de 2025'
  ),
  (
    '0971e01b-4103-4957-9d1a-5aef3a4111b0',
    'INV-2025-004',
    499.90,
    'BRL',
    'pending',
    '2025-04-01',
    '2025-04-30',
    '2025-04-10',
    NULL,
    'credit_card',
    'enterprise',
    'Fatura de abril de 2025'
  )
ON CONFLICT (invoice_number) DO NOTHING;