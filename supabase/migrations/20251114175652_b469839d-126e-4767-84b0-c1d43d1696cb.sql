-- Adicionar coluna updated_at nas tabelas que faltam
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();