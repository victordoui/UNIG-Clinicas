-- Criar tabela global_settings para configurações globais do sistema
CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas super admins podem visualizar e gerenciar configurações globais
CREATE POLICY "Only super admins can view global settings"
  ON public.global_settings FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Only super admins can insert global settings"
  ON public.global_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can update global settings"
  ON public.global_settings FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can delete global settings"
  ON public.global_settings FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Inserir configurações padrão
INSERT INTO public.global_settings (setting_key, setting_value) VALUES 
('organization_defaults', '{
  "max_users": 10,
  "max_products": 1000,
  "subscription_plan": "basic"
}'::jsonb),
('security_settings', '{
  "require_user_approval": true,
  "enable_2fa": false,
  "max_session_time_minutes": 480,
  "max_login_attempts": 5,
  "lockout_duration_minutes": 30
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_global_settings_updated_at
  BEFORE UPDATE ON public.global_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();