
create table public.launchpad_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null,
  favorites text[] not null default '{}',
  hidden text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, organization_id)
);

alter table public.launchpad_preferences enable row level security;

create policy "Users can view own launchpad prefs"
  on public.launchpad_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own launchpad prefs"
  on public.launchpad_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own launchpad prefs"
  on public.launchpad_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own launchpad prefs"
  on public.launchpad_preferences for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_launchpad_preferences_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger launchpad_preferences_touch
  before update on public.launchpad_preferences
  for each row execute function public.touch_launchpad_preferences_updated_at();
