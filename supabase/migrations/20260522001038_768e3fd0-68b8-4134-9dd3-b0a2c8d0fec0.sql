
-- FASE 21: Exportações contábeis

CREATE TABLE IF NOT EXISTS public.accounting_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('movimentacoes','contas_pagas','ajustes','consolidado')),
  formato TEXT NOT NULL DEFAULT 'csv' CHECK (formato IN ('csv','txt')),
  status TEXT NOT NULL DEFAULT 'gerando' CHECK (status IN ('gerando','concluido','erro')),
  total_linhas INT NOT NULL DEFAULT 0,
  arquivo_path TEXT,
  hash_integridade TEXT,
  erro_msg TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ae_org ON public.accounting_exports(organization_id, created_at DESC);

ALTER TABLE public.accounting_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ae_select" ON public.accounting_exports FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "ae_insert" ON public.accounting_exports FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "ae_update" ON public.accounting_exports FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id());
CREATE POLICY "ae_delete" ON public.accounting_exports FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('accounting-exports', 'accounting-exports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ae_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accounting-exports'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "ae_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accounting-exports'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);

CREATE POLICY "ae_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'accounting-exports'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text);
