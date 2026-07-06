ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_type text NOT NULL DEFAULT 'preset',
  ADD COLUMN IF NOT EXISTS cover_value jsonb NOT NULL DEFAULT '{"preset":"unig-default"}'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_overlay numeric NOT NULL DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS cover_updated_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cover_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cover_type_check
  CHECK (cover_type IN ('preset','color','gradient','image','combo'));