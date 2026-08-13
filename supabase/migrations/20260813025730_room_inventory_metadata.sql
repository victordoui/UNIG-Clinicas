-- Metadados de inventário para espaços acadêmicos.
-- Aplicar no projeto vinculado antes da importação da planilha UNIG-NI.
alter table public.rooms
  add column if not exists seats_count integer,
  add column if not exists has_audio_system boolean not null default false,
  add column if not exists has_tv boolean not null default false,
  add column if not exists has_whiteboard boolean not null default false,
  add column if not exists has_interactive_screen boolean not null default false,
  add column if not exists furniture_type text,
  add column if not exists quality_tier text,
  add column if not exists usage_restriction text;

alter table public.rooms
  drop constraint if exists rooms_seats_count_nonnegative;

alter table public.rooms
  add constraint rooms_seats_count_nonnegative
  check (seats_count is null or seats_count >= 0);
