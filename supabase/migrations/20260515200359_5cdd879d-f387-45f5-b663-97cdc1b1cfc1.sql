ALTER TABLE public.council_members 
  ADD COLUMN IF NOT EXISTS nome_exibicao text,
  ADD COLUMN IF NOT EXISTS foto_url text;