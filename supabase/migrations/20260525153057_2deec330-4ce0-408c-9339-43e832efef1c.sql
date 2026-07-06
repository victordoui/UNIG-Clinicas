
-- 1) Update role check
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check
  CHECK (role = ANY (ARRAY[
    'organization_admin','administrador','compras','almoxarifado','solicitante','visitante',
    'coordenador_operacoes','gerente_geral','engenheira','validador_regulatorio'
  ]));

-- 2) New CI statuses
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'aguardando_validacao_regulatoria';
ALTER TYPE public.ci_status ADD VALUE IF NOT EXISTS 'ajuste_solicitado_regulatorio';

-- 3) New columns
ALTER TABLE public.ci_requests
  ADD COLUMN IF NOT EXISTS requires_regulatory_validation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS regulatory_reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS regulatory_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS regulatory_review_notes text;

-- 4) RPCs (regulatory flow)
CREATE OR REPLACE FUNCTION public.ci_request_regulatory_review(_id uuid, _comentario text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_has_role(_id, ARRAY['coordenador_operacoes','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas o Coordenador pode solicitar validação regulatória';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'CI não encontrada'; END IF;

  UPDATE public.ci_requests
     SET status = 'aguardando_validacao_regulatoria',
         requires_regulatory_validation = true,
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'enviado_regulatorio', v_from, 'aguardando_validacao_regulatoria', auth.uid(),
          jsonb_build_object('comentario', _comentario));
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_regulatory_request_adjustment(_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF _motivo IS NULL OR length(trim(_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo do ajuste é obrigatório';
  END IF;
  IF NOT public._ci_user_has_role(_id, ARRAY['validador_regulatorio','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas o Validador Regulatório pode solicitar ajuste';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  UPDATE public.ci_requests
     SET status = 'ajuste_solicitado_regulatorio',
         regulatory_review_notes = _motivo,
         regulatory_reviewer_id = auth.uid(),
         regulatory_reviewed_at = now(),
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'ajuste_regulatorio_solicitado', v_from, 'ajuste_solicitado_regulatorio', auth.uid(),
          jsonb_build_object('motivo', _motivo));
END;
$$;

CREATE OR REPLACE FUNCTION public.ci_regulatory_approve(_id uuid, _parecer text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_from text;
BEGIN
  IF NOT public._ci_user_has_role(_id, ARRAY['validador_regulatorio','administrador','organization_admin','admin','super_admin']) THEN
    RAISE EXCEPTION 'Apenas o Validador Regulatório pode aprovar';
  END IF;
  SELECT organization_id, status::text INTO v_org, v_from FROM public.ci_requests WHERE id = _id;

  UPDATE public.ci_requests
     SET status = 'aguardando_coordenador',
         regulatory_review_notes = COALESCE(_parecer, regulatory_review_notes),
         regulatory_reviewer_id = auth.uid(),
         regulatory_reviewed_at = now(),
         updated_at = now()
   WHERE id = _id;

  INSERT INTO public.ci_status_history(ci_id, organization_id, event_type, from_status, to_status, actor_id, payload)
  VALUES (_id, v_org, 'ok_regulatorio', v_from, 'aguardando_coordenador', auth.uid(),
          jsonb_build_object('parecer', _parecer));
END;
$$;

-- 5) Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ci-validation-docs', 'ci-validation-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 6) Attachments table
CREATE TABLE IF NOT EXISTS public.ci_validation_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ci_id uuid NOT NULL REFERENCES public.ci_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  validation_type text NOT NULL CHECK (validation_type IN ('tecnica','regulatoria')),
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ci_validation_attachments_ci_idx
  ON public.ci_validation_attachments(ci_id);

ALTER TABLE public.ci_validation_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view ci attachments" ON public.ci_validation_attachments;
CREATE POLICY "members can view ci attachments"
ON public.ci_validation_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = ci_validation_attachments.organization_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
);

DROP POLICY IF EXISTS "members can insert ci attachments" ON public.ci_validation_attachments;
CREATE POLICY "members can insert ci attachments"
ON public.ci_validation_attachments FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = ci_validation_attachments.organization_id
        AND m.user_id = auth.uid()
        AND m.is_active = true
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
  )
);

DROP POLICY IF EXISTS "uploader or admin can delete ci attachments" ON public.ci_validation_attachments;
CREATE POLICY "uploader or admin can delete ci attachments"
ON public.ci_validation_attachments FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = ci_validation_attachments.organization_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND m.role IN ('administrador','organization_admin','admin')
  )
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
);

-- 7) Storage policies for the bucket (path = {org_id}/{ci_id}/{file})
DROP POLICY IF EXISTS "ci docs read for org members" ON storage.objects;
CREATE POLICY "ci docs read for org members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ci-validation-docs'
  AND (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid()
        AND m.is_active = true
        AND m.organization_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
  )
);

DROP POLICY IF EXISTS "ci docs upload for org members" ON storage.objects;
CREATE POLICY "ci docs upload for org members"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ci-validation-docs'
  AND (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid()
        AND m.is_active = true
        AND m.organization_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
  )
);

DROP POLICY IF EXISTS "ci docs delete for org members" ON storage.objects;
CREATE POLICY "ci docs delete for org members"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ci-validation-docs'
  AND (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid()
        AND m.is_active = true
        AND m.organization_id::text = (storage.foldername(name))[1]
        AND m.role IN ('administrador','organization_admin','admin','validador_regulatorio','engenheira','coordenador_operacoes')
    )
    OR owner = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_super_admin = true)
  )
);

-- 8) Seed validador_regulatorio test user
DO $$
DECLARE
  v_org uuid := 'b3bf86a2-5856-4d8e-93b4-9388d126bab7';
  v_id  uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = 'validador.regulatorio@teste.com';
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'validador.regulatorio@teste.com', crypt('Teste@123', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Validador Regulatório (Kelly)'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id, jsonb_build_object('sub', v_id::text, 'email', 'validador.regulatorio@teste.com'), 'email', v_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, email, full_name, is_super_admin, password_change_required, created_at, updated_at)
  VALUES (v_id, 'validador.regulatorio@teste.com', 'Validador Regulatório (Kelly)', false, false, now(), now())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

  INSERT INTO public.organization_members (organization_id, user_id, role, is_active, created_at)
  VALUES (v_org, v_id, 'validador_regulatorio', true, now())
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = true;
END $$;
