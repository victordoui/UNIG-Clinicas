-- Create missing tables needed by the application

-- 1. Category notifications table
CREATE TABLE public.category_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  notification_email TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, notification_email)
);

-- 2. User approvals table (for tracking pending user approvals)
CREATE TABLE public.user_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL DEFAULT 'funcionario',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.category_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for category_notifications
CREATE POLICY "Authenticated users can view category notifications" 
ON public.category_notifications FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage category notifications" 
ON public.category_notifications FOR ALL 
USING (auth.role() = 'authenticated');

-- RLS Policies for user_approvals
CREATE POLICY "Users can view their own approval requests" 
ON public.user_approvals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all approval requests" 
ON public.user_approvals FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gerente')
  )
);

CREATE POLICY "Users can create their own approval requests" 
ON public.user_approvals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update approval requests" 
ON public.user_approvals FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gerente')
  )
);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_category_notifications_updated_at
  BEFORE UPDATE ON public.category_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.category_notifications (category, notification_email, created_by) VALUES
  ('Eletrônicos', 'admin@vstock.com', (SELECT id FROM auth.users LIMIT 1)),
  ('Roupas', 'admin@vstock.com', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (category, notification_email) DO NOTHING;