-- Registro explícito de que os alertas do protocolo foram revisados antes da sessão.
alter table public.aesthetic_sessions
  add column if not exists contraindications_reviewed boolean not null default false;

comment on column public.aesthetic_sessions.contraindications_reviewed is
  'Confirma que o profissional revisou os alertas e contraindicações do protocolo antes da sessão.';
