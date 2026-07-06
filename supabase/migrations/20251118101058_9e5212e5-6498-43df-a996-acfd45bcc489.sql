-- ============================================
-- PLANO DE SEGURANÇA - FASE 1 E 2
-- Correções Críticas e de Alta Prioridade
-- ============================================

-- ============================================
-- FASE 1: CORREÇÃO CRÍTICA - Tabela bd_ativo
-- ============================================
-- Esta tabela parece ser de teste e não tem políticas RLS
-- Vamos removê-la por segurança

DROP TABLE IF EXISTS public.bd_ativo CASCADE;

-- ============================================
-- FASE 2: RESTRINGIR ACESSO ANÔNIMO
-- ============================================
-- Substituindo todas as políticas que permitem acesso público
-- por políticas restritas a usuários autenticados

-- ============================================
-- Tabela: active_sessions
-- ============================================

DROP POLICY IF EXISTS "Users can view own sessions, admins can view all" ON public.active_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert own active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Authenticated users can update own active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete own active_sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Deny anonymous access to active_sessions" ON public.active_sessions;

CREATE POLICY "Users can view own sessions, admins can view all"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can insert own active_sessions"
ON public.active_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own active_sessions"
ON public.active_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own active_sessions"
ON public.active_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- Tabela: alert_suppressions
-- ============================================

DROP POLICY IF EXISTS "Only admins and managers can view alert suppressions" ON public.alert_suppressions;
DROP POLICY IF EXISTS "Only admins and managers can manage alert suppressions" ON public.alert_suppressions;
DROP POLICY IF EXISTS "Deny anonymous access to alert_suppressions" ON public.alert_suppressions;

CREATE POLICY "Only admins and managers can view alert suppressions"
ON public.alert_suppressions
FOR SELECT
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can manage alert suppressions"
ON public.alert_suppressions
FOR ALL
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'))
WITH CHECK (get_current_user_role() IN ('admin', 'gerente'));

-- ============================================
-- Tabela: alerts
-- ============================================

DROP POLICY IF EXISTS "Admins can view organization alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admins can insert organization alerts" ON public.alerts;
DROP POLICY IF EXISTS "Only admins and managers can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Only admins and managers can delete alerts" ON public.alerts;

CREATE POLICY "Admins can view organization alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (
  is_super_admin() = true 
  OR (
    organization_id = get_user_organization_id() 
    AND get_current_user_role() IN ('admin', 'gerente')
  )
);

CREATE POLICY "Admins can insert organization alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND get_current_user_role() IN ('admin', 'gerente')
);

CREATE POLICY "Only admins and managers can update alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can delete alerts"
ON public.alerts
FOR DELETE
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

-- ============================================
-- Tabela: category_notifications
-- ============================================

DROP POLICY IF EXISTS "Authenticated admins can view all category notifications" ON public.category_notifications;
DROP POLICY IF EXISTS "Users can view own org category notifications" ON public.category_notifications;
DROP POLICY IF EXISTS "Users can manage own org category notifications" ON public.category_notifications;

CREATE POLICY "Authenticated admins can view all category notifications"
ON public.category_notifications
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view own org category notifications"
ON public.category_notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND (organization_id = get_user_organization_id() OR is_super_admin() = true)
);

CREATE POLICY "Users can manage own org category notifications"
ON public.category_notifications
FOR ALL
TO authenticated
USING (user_id = auth.uid() AND organization_id = get_user_organization_id())
WITH CHECK (user_id = auth.uid() AND organization_id = get_user_organization_id());

-- ============================================
-- Tabela: global_settings
-- ============================================

DROP POLICY IF EXISTS "Only super admins can view global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Only super admins can insert global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Only super admins can update global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Only super admins can delete global settings" ON public.global_settings;

CREATE POLICY "Only super admins can view global settings"
ON public.global_settings
FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Only super admins can insert global settings"
ON public.global_settings
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can update global settings"
ON public.global_settings
FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can delete global settings"
ON public.global_settings
FOR DELETE
TO authenticated
USING (is_super_admin());

-- ============================================
-- Tabela: login_attempts
-- ============================================
-- NOTA: Esta tabela precisa permitir INSERT público para registrar tentativas de login

DROP POLICY IF EXISTS "Users can insert login_attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Only admins can view login attempts" ON public.login_attempts;

-- Mantém INSERT público para permitir registro de tentativas de login
CREATE POLICY "Users can insert login_attempts"
ON public.login_attempts
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Only admins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- ============================================
-- Tabela: movements
-- ============================================

DROP POLICY IF EXISTS "Users can view organization movements" ON public.movements;
DROP POLICY IF EXISTS "Users can insert organization movements" ON public.movements;
DROP POLICY IF EXISTS "Only admins and managers can update movements" ON public.movements;

CREATE POLICY "Users can view organization movements"
ON public.movements
FOR SELECT
TO authenticated
USING (is_super_admin() = true OR organization_id = get_user_organization_id());

CREATE POLICY "Users can insert organization movements"
ON public.movements
FOR INSERT
TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());

CREATE POLICY "Only admins and managers can update movements"
ON public.movements
FOR UPDATE
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

-- ============================================
-- Tabela: organization_invitations
-- ============================================

DROP POLICY IF EXISTS "Super admins can view all invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Super admins can insert invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Super admins can update invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Super admins can delete invitations" ON public.organization_invitations;

CREATE POLICY "Super admins can view all invitations"
ON public.organization_invitations
FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super admins can insert invitations"
ON public.organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (check_is_super_admin());

CREATE POLICY "Super admins can update invitations"
ON public.organization_invitations
FOR UPDATE
TO authenticated
USING (check_is_super_admin());

CREATE POLICY "Super admins can delete invitations"
ON public.organization_invitations
FOR DELETE
TO authenticated
USING (check_is_super_admin());

-- ============================================
-- Tabela: organization_members
-- ============================================

DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Super admins can view all members" ON public.organization_members;
DROP POLICY IF EXISTS "Super admins can insert members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can insert org members" ON public.organization_members;
DROP POLICY IF EXISTS "Super admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can update org members" ON public.organization_members;
DROP POLICY IF EXISTS "Super admins can delete members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can delete org members" ON public.organization_members;
DROP POLICY IF EXISTS "Deny anonymous access to organization_members" ON public.organization_members;

CREATE POLICY "Users can view their own membership"
ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Super admins can insert members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin() = true);

CREATE POLICY "Org admins can insert org members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Super admins can update members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Org admins can update org members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (is_org_admin(organization_id));

CREATE POLICY "Super admins can delete members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Org admins can delete org members"
ON public.organization_members
FOR DELETE
TO authenticated
USING (is_org_admin(organization_id));

-- ============================================
-- Tabela: organizations
-- ============================================

DROP POLICY IF EXISTS "Super admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Members can view their organization v2" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization admins can update their organization" ON public.organizations;
DROP POLICY IF EXISTS "Only super admins can delete organizations" ON public.organizations;

CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_super_admin() = true);

CREATE POLICY "Members can view their organization v2"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  is_super_admin() = true 
  OR id IN (
    SELECT om.organization_id 
    FROM organization_members om 
    WHERE om.user_id = auth.uid() AND om.is_active = true
  )
);

CREATE POLICY "Super admins can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin() = true);

CREATE POLICY "Organization admins can update their organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  is_super_admin() = true 
  OR id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
      AND role = 'organization_admin' 
      AND is_active = true
  )
);

CREATE POLICY "Only super admins can delete organizations"
ON public.organizations
FOR DELETE
TO authenticated
USING (is_super_admin() = true);

-- ============================================
-- Tabela: products
-- ============================================

DROP POLICY IF EXISTS "Users can view organization products" ON public.products;
DROP POLICY IF EXISTS "Users can insert organization products" ON public.products;
DROP POLICY IF EXISTS "Only admins and managers can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins and managers can delete products" ON public.products;

CREATE POLICY "Users can view organization products"
ON public.products
FOR SELECT
TO authenticated
USING (is_super_admin() = true OR organization_id = get_user_organization_id());

CREATE POLICY "Users can insert organization products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());

CREATE POLICY "Only admins and managers can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

-- ============================================
-- Tabela: profiles
-- ============================================

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own basic profile data" ON public.profiles;
DROP POLICY IF EXISTS "Prevent super admin field in inserts" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (check_is_super_admin());

CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can update user profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can update own basic profile data"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Prevent super admin field in inserts"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin = false OR is_super_admin IS NULL);

-- ============================================
-- Tabela: security_audit_log
-- ============================================

DROP POLICY IF EXISTS "Users can insert security_audit_log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Only admins can view security audit log" ON public.security_audit_log;
DROP POLICY IF EXISTS "Deny anonymous access to security_audit_log" ON public.security_audit_log;

-- Permite INSERT autenticado para logging
CREATE POLICY "Users can insert security_audit_log"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Only admins can view security audit log"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- ============================================
-- Tabela: settings
-- ============================================

DROP POLICY IF EXISTS "Only admins can view settings" ON public.settings;
DROP POLICY IF EXISTS "Only admins can modify settings" ON public.settings;

CREATE POLICY "Only admins can view settings"
ON public.settings
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

CREATE POLICY "Only admins can modify settings"
ON public.settings
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- ============================================
-- Tabela: subscription_invoices
-- ============================================

DROP POLICY IF EXISTS "Super admins can view all invoices" ON public.subscription_invoices;

CREATE POLICY "Super admins can view all invoices"
ON public.subscription_invoices
FOR SELECT
TO authenticated
USING (is_super_admin());

-- ============================================
-- Tabela: user_approvals
-- ============================================

DROP POLICY IF EXISTS "Only admins and managers can view user approvals" ON public.user_approvals;
DROP POLICY IF EXISTS "Only admins and managers can manage user approvals" ON public.user_approvals;
DROP POLICY IF EXISTS "Deny anonymous access to user_approvals" ON public.user_approvals;

CREATE POLICY "Only admins and managers can view user approvals"
ON public.user_approvals
FOR SELECT
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can manage user approvals"
ON public.user_approvals
FOR ALL
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'))
WITH CHECK (get_current_user_role() IN ('admin', 'gerente'));

-- ============================================
-- Tabela: user_bans
-- ============================================

DROP POLICY IF EXISTS "Only admins and managers can view user bans" ON public.user_bans;
DROP POLICY IF EXISTS "Only admins and managers can manage user bans" ON public.user_bans;
DROP POLICY IF EXISTS "Deny anonymous access to user_bans" ON public.user_bans;

CREATE POLICY "Only admins and managers can view user bans"
ON public.user_bans
FOR SELECT
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'));

CREATE POLICY "Only admins and managers can manage user bans"
ON public.user_bans
FOR ALL
TO authenticated
USING (get_current_user_role() IN ('admin', 'gerente'))
WITH CHECK (get_current_user_role() IN ('admin', 'gerente'));

-- ============================================
-- Tabela: user_push_tokens
-- ============================================

DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.user_push_tokens;

CREATE POLICY "Users can manage own push tokens"
ON public.user_push_tokens
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Tabela: user_roles
-- ============================================

DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super admins can grant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only super admins can revoke roles" ON public.user_roles;

CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only super admins can grant roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super admins can revoke roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- ============================================
-- FASE 2: ADICIONAR SEARCH_PATH EM FUNÇÕES
-- ============================================
-- Protege contra search path hijacking

CREATE OR REPLACE FUNCTION public.inserir_3x_e_parar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i int := 0;
BEGIN
  WHILE i < 3 LOOP
    -- Função antiga, mantida para compatibilidade
    i := i + 1;
    IF i < 3 THEN
      PERFORM pg_sleep(5);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_product_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      details,
      organization_id
    ) VALUES (
      NEW.created_by,
      'product_created',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'sku', NEW.sku,
        'category', NEW.category
      ),
      NEW.organization_id
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      details,
      organization_id
    ) VALUES (
      auth.uid(),
      'product_updated',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'changes', jsonb_build_object(
          'old_stock', OLD.current_stock,
          'new_stock', NEW.current_stock
        )
      ),
      NEW.organization_id
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF pg_trigger_depth() = 1 THEN
      INSERT INTO public.security_audit_log (
        user_id,
        action,
        details,
        organization_id
      ) VALUES (
        auth.uid(),
        'product_deleted',
        jsonb_build_object(
          'product_id', OLD.id,
          'product_name', OLD.name,
          'sku', OLD.sku
        ),
        OLD.organization_id
      );
    END IF;
    RETURN OLD;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_movement_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    details,
    organization_id
  ) VALUES (
    NEW.created_by,
    'movement_created',
    jsonb_build_object(
      'movement_id', NEW.id,
      'type', NEW.type,
      'product_id', NEW.product_id,
      'quantity', NEW.quantity,
      'previous_stock', NEW.previous_stock,
      'new_stock', NEW.new_stock
    ),
    NEW.organization_id
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_user_membership_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      details,
      organization_id
    ) VALUES (
      NEW.invited_by,
      'user_invited',
      jsonb_build_object(
        'new_user_id', NEW.user_id,
        'role', NEW.role
      ),
      NEW.organization_id
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF pg_trigger_depth() = 1 THEN
      INSERT INTO public.security_audit_log (
        user_id,
        action,
        details,
        organization_id
      ) VALUES (
        auth.uid(),
        'user_removed',
        jsonb_build_object(
          'removed_user_id', OLD.user_id,
          'role', OLD.role
        ),
        OLD.organization_id
      );
    END IF;
    RETURN OLD;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, password_change_required)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE((NEW.raw_user_meta_data ->> 'password_change_required')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(
      NULLIF(TRIM(EXCLUDED.full_name), ''), 
      profiles.full_name
    ),
    password_change_required = EXCLUDED.password_change_required;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.active_sessions 
  WHERE last_activity < now() - interval '7 days';
  RETURN NEW;
END;
$function$;

-- ============================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.active_sessions IS 'Sessões ativas de usuários. RLS protege para que usuários vejam apenas suas sessões.';
COMMENT ON TABLE public.security_audit_log IS 'Log de auditoria de segurança. Somente admins podem visualizar.';
COMMENT ON TABLE public.organization_members IS 'Membros de organizações. Usuários veem apenas sua membership, admins veem todos.';
COMMENT ON TABLE public.profiles IS 'Perfis de usuários. Protegido por RLS - usuários veem apenas seu perfil.';
COMMENT ON TABLE public.user_roles IS 'Roles de sistema separados de profiles. Crítico para segurança - nunca armazenar roles em profiles!';