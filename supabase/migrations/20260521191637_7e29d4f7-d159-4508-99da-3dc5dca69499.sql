create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.supplier_sla_notifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null,
  kind text not null check (kind in ('nf_reminder','quote_stale')),
  ref_id uuid not null,
  organization_id uuid,
  notified_at timestamptz not null default now()
);

create index if not exists idx_supplier_sla_notif_dedup
  on public.supplier_sla_notifications (supplier_id, kind, ref_id, notified_at desc);

alter table public.supplier_sla_notifications enable row level security;

create policy "authenticated can read sla notifications"
  on public.supplier_sla_notifications
  for select
  to authenticated
  using (true);
