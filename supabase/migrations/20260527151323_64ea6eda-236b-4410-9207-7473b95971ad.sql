
ALTER TABLE public.user_invitations
  ADD COLUMN IF NOT EXISTS invitee_type text,
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS filled_name text,
  ADD COLUMN IF NOT EXISTS resent_from uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS unit_campus text,
  ADD COLUMN IF NOT EXISTS work_location text,
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS user_type text;

CREATE INDEX IF NOT EXISTS idx_user_invitations_org_created
  ON public.user_invitations(organization_id, created_at DESC);
