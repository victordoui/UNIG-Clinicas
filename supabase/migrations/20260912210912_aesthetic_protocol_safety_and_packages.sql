-- Pacotes e parâmetros administrativos de segurança para protocolos estéticos.
-- A avaliação de contraindicações e a decisão clínica continuam sob responsabilidade
-- do profissional autorizado; estes campos não automatizam elegibilidade.

alter table public.aesthetic_protocols
  add column if not exists sessions_included integer,
  add column if not exists package_price numeric(12,2),
  add column if not exists contraindication_notes text,
  add column if not exists minimum_interval_days integer;

alter table public.aesthetic_protocols
  drop constraint if exists aesthetic_protocols_sessions_included_check,
  add constraint aesthetic_protocols_sessions_included_check
    check (sessions_included is null or sessions_included > 0),
  drop constraint if exists aesthetic_protocols_package_price_check,
  add constraint aesthetic_protocols_package_price_check
    check (package_price is null or package_price >= 0),
  drop constraint if exists aesthetic_protocols_minimum_interval_days_check,
  add constraint aesthetic_protocols_minimum_interval_days_check
    check (minimum_interval_days is null or minimum_interval_days >= 0);

comment on column public.aesthetic_protocols.sessions_included is
  'Quantidade de sessões contratadas quando o protocolo é vendido como pacote.';
comment on column public.aesthetic_protocols.package_price is
  'Valor estimado administrativo do pacote; não substitui orçamento ou aceite.';
comment on column public.aesthetic_protocols.contraindication_notes is
  'Lembretes internos para revisão pelo profissional; não é decisão clínica automática.';
comment on column public.aesthetic_protocols.minimum_interval_days is
  'Intervalo mínimo de referência entre sessões, revisado pelo profissional.';
