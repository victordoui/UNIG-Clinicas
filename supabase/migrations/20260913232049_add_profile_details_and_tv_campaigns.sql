alter table public.profiles
  add column if not exists job_title text,
  add column if not exists bio text check (bio is null or char_length(bio) <= 280);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_owner_manage on storage.objects;
create policy avatars_owner_manage
  on storage.objects for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create table if not exists public.tv_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  title text not null check (char_length(title) between 3 and 100),
  message text not null check (char_length(message) between 3 and 280),
  media_type text not null default 'image' check (media_type in ('image', 'video', 'text')),
  media_url text,
  cta_label text check (cta_label is null or char_length(cta_label) <= 40),
  display_seconds smallint not null default 12 check (display_seconds between 5 and 60),
  priority smallint not null default 0 check (priority between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists tv_campaigns_organization_status_idx
  on public.tv_campaigns (organization_id, status, priority desc);

alter table public.tv_campaigns enable row level security;

create policy tv_campaigns_select_organization_staff
  on public.tv_campaigns for select to authenticated
  using (
    exists (
      select 1
      from public.user_roles user_role
      where user_role.user_id = (select auth.uid())
        and user_role.organization_id = tv_campaigns.organization_id
        and user_role.is_active
    )
  );

create policy tv_campaigns_manage_communication_admins
  on public.tv_campaigns for all to authenticated
  using (
    exists (
      select 1
      from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = (select auth.uid())
        and user_role.organization_id = tv_campaigns.organization_id
        and user_role.is_active
        and role.code in ('super_admin', 'organization_admin', 'clinic_manager')
    )
  )
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = (select auth.uid())
        and user_role.organization_id = tv_campaigns.organization_id
        and user_role.is_active
        and role.code in ('super_admin', 'organization_admin', 'clinic_manager')
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tv-campaigns',
  'tv-campaigns',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy tv_campaigns_media_manage
  on storage.objects for all to authenticated
  using (
    bucket_id = 'tv-campaigns'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = (select auth.uid())
        and user_role.is_active
        and role.code in ('super_admin', 'organization_admin', 'clinic_manager')
    )
  )
  with check (
    bucket_id = 'tv-campaigns'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.user_roles user_role
      join public.roles role on role.id = user_role.role_id
      where user_role.user_id = (select auth.uid())
        and user_role.is_active
        and role.code in ('super_admin', 'organization_admin', 'clinic_manager')
    )
  );
