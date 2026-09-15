alter table public.tv_campaigns
  add column if not exists display_mode text not null default 'integrated'
    check (display_mode in ('integrated', 'fullscreen')),
  add column if not exists media_fit text not null default 'cover'
    check (media_fit in ('cover', 'contain'));

comment on column public.tv_campaigns.display_mode is
  'Presentation format in the TV carousel: integrated keeps the panel identity; fullscreen is immersive.';
comment on column public.tv_campaigns.media_fit is
  'How campaign media is rendered inside its presentation format.';
