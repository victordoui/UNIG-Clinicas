
-- Adicionar coluna destination na tabela movements para transferências
ALTER TABLE public.movements ADD COLUMN destination_location TEXT;

-- Adicionar coluna location_info na tabela movements para entradas/saídas
ALTER TABLE public.movements ADD COLUMN location_info TEXT;

-- Criar tabela para aprovação de usuários
CREATE TABLE public.user_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    requested_role user_role NOT NULL DEFAULT 'usuario',
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
);

-- Habilitar RLS na tabela user_approvals
ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;

-- Política para gerentes e admins verem solicitações
CREATE POLICY "Gerentes e admins podem ver solicitações" ON public.user_approvals
    FOR SELECT USING (
        public.get_current_user_role() IN ('admin', 'gerente')
    );

-- Política para gerentes e admins gerenciarem solicitações
CREATE POLICY "Gerentes e admins podem gerenciar solicitações" ON public.user_approvals
    FOR ALL USING (
        public.get_current_user_role() IN ('admin', 'gerente')
    );

-- Criar tabela para controle de alertas (evitar repetições)
CREATE TABLE public.alert_suppressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    suppressed_until TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela alert_suppressions
ALTER TABLE public.alert_suppressions ENABLE ROW LEVEL SECURITY;

-- Política para todos verem suppressões
CREATE POLICY "Todos podem ver suppressões" ON public.alert_suppressions
    FOR SELECT USING (true);

-- Política para gerentes e admins gerenciarem suppressões
CREATE POLICY "Gerentes e admins podem gerenciar suppressões" ON public.alert_suppressions
    FOR ALL USING (
        public.get_current_user_role() IN ('admin', 'gerente')
    );

-- Criar tabela para configurações de notificação por categoria
CREATE TABLE public.category_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category product_category NOT NULL UNIQUE,
    notification_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configuração padrão para manutenção
INSERT INTO public.category_notifications (category, notification_email) 
VALUES ('manutencao', 'manutencao@empresa.com');

-- Habilitar RLS na tabela category_notifications
ALTER TABLE public.category_notifications ENABLE ROW LEVEL SECURITY;

-- Política para todos verem configurações
CREATE POLICY "Todos podem ver configurações de notificação" ON public.category_notifications
    FOR SELECT USING (true);

-- Política para apenas admins gerenciarem
CREATE POLICY "Apenas admins podem gerenciar configurações" ON public.category_notifications
    FOR ALL USING (
        public.get_current_user_role() = 'admin'
    );

-- Criar tabela para sessões ativas (usuários logados)
CREATE TABLE public.active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela active_sessions
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Política para admins e gerentes verem sessões ativas
CREATE POLICY "Admins e gerentes podem ver sessões ativas" ON public.active_sessions
    FOR SELECT USING (
        public.get_current_user_role() IN ('admin', 'gerente')
    );

-- Política para inserir própria sessão
CREATE POLICY "Usuários podem inserir própria sessão" ON public.active_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para atualizar própria sessão
CREATE POLICY "Usuários podem atualizar própria sessão" ON public.active_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Função para limpar sessões antigas
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.active_sessions 
    WHERE last_activity < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at em category_notifications
CREATE TRIGGER update_category_notifications_updated_at
    BEFORE UPDATE ON public.category_notifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
