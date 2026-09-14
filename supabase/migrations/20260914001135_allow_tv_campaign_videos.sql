alter table public.tv_campaigns
  add column if not exists media_alt_text text check (media_alt_text is null or char_length(media_alt_text) <= 160);

update storage.buckets
set file_size_limit = 31457280,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
where id = 'tv-campaigns';
