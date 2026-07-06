-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'usuario',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  category TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movements table
CREATE TABLE public.movements (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  location_info TEXT,
  destination TEXT,
  destination_location TEXT,
  document_number TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create active_sessions table
CREATE TABLE public.active_sessions (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_approvals table
CREATE TABLE public.user_approvals (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_bans table
CREATE TABLE public.user_bans (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  banned_by UUID,
  reason TEXT,
  banned_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create category_notifications table
CREATE TABLE public.category_notifications (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create login_attempts table
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security_audit_log table
CREATE TABLE public.security_audit_log (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert_suppressions table
CREATE TABLE public.alert_suppressions (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  product_id UUID,
  suppressed_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.products ADD CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);
ALTER TABLE public.movements ADD CONSTRAINT fk_movements_product_id FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.movements ADD CONSTRAINT fk_movements_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);
ALTER TABLE public.alerts ADD CONSTRAINT fk_alerts_product_id FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.active_sessions ADD CONSTRAINT fk_active_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.user_approvals ADD CONSTRAINT fk_user_approvals_user_id FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.user_approvals ADD CONSTRAINT fk_user_approvals_approved_by FOREIGN KEY (approved_by) REFERENCES public.profiles(user_id);
ALTER TABLE public.user_bans ADD CONSTRAINT fk_user_bans_user_id FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.user_bans ADD CONSTRAINT fk_user_bans_banned_by FOREIGN KEY (banned_by) REFERENCES public.profiles(user_id);
ALTER TABLE public.category_notifications ADD CONSTRAINT fk_category_notifications_user_id FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.security_audit_log ADD CONSTRAINT fk_security_audit_log_user_id FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
ALTER TABLE public.alert_suppressions ADD CONSTRAINT fk_alert_suppressions_product_id FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE public.alert_suppressions ADD CONSTRAINT fk_alert_suppressions_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_suppressions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create RLS policies for products
CREATE POLICY "Users can view all products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Users can insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Users can delete products" ON public.products FOR DELETE USING (true);

-- Create RLS policies for movements
CREATE POLICY "Users can view all movements" ON public.movements FOR SELECT USING (true);
CREATE POLICY "Users can insert movements" ON public.movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update movements" ON public.movements FOR UPDATE USING (true);

-- Create RLS policies for alerts
CREATE POLICY "Users can view all alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Users can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update alerts" ON public.alerts FOR UPDATE USING (true);
CREATE POLICY "Users can delete alerts" ON public.alerts FOR DELETE USING (true);

-- Create RLS policies for settings
CREATE POLICY "Users can view all settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins can modify settings" ON public.settings FOR ALL USING (true);

-- Create RLS policies for remaining tables
CREATE POLICY "Users can view all active_sessions" ON public.active_sessions FOR SELECT USING (true);
CREATE POLICY "Users can insert active_sessions" ON public.active_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update active_sessions" ON public.active_sessions FOR UPDATE USING (true);
CREATE POLICY "Users can delete active_sessions" ON public.active_sessions FOR DELETE USING (true);

CREATE POLICY "Users can view all user_approvals" ON public.user_approvals FOR SELECT USING (true);
CREATE POLICY "Users can manage user_approvals" ON public.user_approvals FOR ALL USING (true);

CREATE POLICY "Users can view all user_bans" ON public.user_bans FOR SELECT USING (true);
CREATE POLICY "Users can manage user_bans" ON public.user_bans FOR ALL USING (true);

CREATE POLICY "Users can view all category_notifications" ON public.category_notifications FOR SELECT USING (true);
CREATE POLICY "Users can manage category_notifications" ON public.category_notifications FOR ALL USING (true);

CREATE POLICY "Users can view all login_attempts" ON public.login_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert login_attempts" ON public.login_attempts FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all security_audit_log" ON public.security_audit_log FOR SELECT USING (true);
CREATE POLICY "Users can insert security_audit_log" ON public.security_audit_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all alert_suppressions" ON public.alert_suppressions FOR SELECT USING (true);
CREATE POLICY "Users can manage alert_suppressions" ON public.alert_suppressions FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_movements_product_id ON public.movements(product_id);
CREATE INDEX idx_movements_created_at ON public.movements(created_at);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_movements_updated_at BEFORE UPDATE ON public.movements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_approvals_updated_at BEFORE UPDATE ON public.user_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_bans_updated_at BEFORE UPDATE ON public.user_bans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_category_notifications_updated_at BEFORE UPDATE ON public.category_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();