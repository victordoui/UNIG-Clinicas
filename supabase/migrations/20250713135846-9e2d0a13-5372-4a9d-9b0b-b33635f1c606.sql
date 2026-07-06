-- Criar enums para tipos de dados
CREATE TYPE user_role AS ENUM ('admin', 'gerente', 'usuario');
CREATE TYPE movement_type AS ENUM ('entrada', 'saida', 'transferencia', 'ajuste');
CREATE TYPE product_category AS ENUM ('eletronicos', 'escritorio', 'limpeza', 'manutencao', 'outros');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'usuario',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE NOT NULL,
    category product_category NOT NULL DEFAULT 'outros',
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    max_stock INTEGER,
    unit_price DECIMAL(10,2),
    barcode TEXT,
    qr_code TEXT,
    location TEXT,
    supplier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela de movimentações
CREATE TABLE public.movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    unit_price DECIMAL(10,2),
    total_value DECIMAL(10,2),
    reason TEXT,
    document_number TEXT,
    supplier TEXT,
    destination TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela de alertas
CREATE TABLE public.alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    product_id UUID REFERENCES public.products(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Função para obter o papel do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Políticas RLS para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para products
CREATE POLICY "All users can view products" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Admins and gerentes can manage products" ON public.products
    FOR ALL USING (
        public.get_current_user_role() IN ('admin', 'gerente')
    );

-- Políticas RLS para movements
CREATE POLICY "All users can view movements" ON public.movements
    FOR SELECT USING (true);

CREATE POLICY "Admins and gerentes can create movements" ON public.movements
    FOR INSERT WITH CHECK (
        public.get_current_user_role() IN ('admin', 'gerente')
    );

-- Políticas RLS para alerts
CREATE POLICY "All users can view alerts" ON public.alerts
    FOR SELECT USING (true);

CREATE POLICY "Admins and gerentes can manage alerts" ON public.alerts
    FOR ALL USING (
        public.get_current_user_role() IN ('admin', 'gerente')
    );

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'usuario'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO public.products (name, description, sku, category, current_stock, min_stock, unit_price, location) VALUES
('Notebook Dell', 'Notebook para escritório', 'NB001', 'eletronicos', 15, 5, 2500.00, 'Estoque A1'),
('Papel A4', 'Resma de papel A4 branco', 'PAP001', 'escritorio', 50, 10, 25.00, 'Estoque B2'),
('Detergente', 'Detergente neutro 500ml', 'DET001', 'limpeza', 30, 10, 8.50, 'Estoque C1'),
('Chave Phillips', 'Chave Phillips tamanho médio', 'CHV001', 'manutencao', 20, 5, 15.00, 'Estoque D1');

-- Inserir alertas de exemplo
INSERT INTO public.alerts (type, title, message, severity) VALUES
('stock_low', 'Estoque Baixo', 'Alguns produtos estão com estoque abaixo do mínimo', 'warning'),
('product_expired', 'Produto Vencendo', 'Produtos próximos ao vencimento', 'error'),
('reorder_needed', 'Necessário Reposição', 'Produtos precisam ser reabastecidos', 'info');