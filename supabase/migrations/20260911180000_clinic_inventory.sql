-- Estoque clínico isolado por organização e clínica.
insert into public.permissions(code, name, description) values
  ('inventory.read', 'Consultar estoque', 'Consultar estoque e alertas da clínica'),
  ('inventory.manage', 'Gerenciar estoque', 'Gerenciar itens, lotes e movimentos de estoque')
on conflict (code) do nothing;

insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code in ('inventory.read', 'inventory.manage')
where r.code in ('super_admin', 'organization_admin', 'clinic_manager') on conflict do nothing;
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = 'inventory.read'
where r.code in ('clinician', 'academic_supervisor', 'receptionist') on conflict do nothing;

create table if not exists public.clinic_inventory_items (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), clinic_id uuid not null references public.clinics(id),
  name text not null, sku text, category text, unit text not null default 'unidade', current_quantity numeric(12,3) not null default 0 check (current_quantity >= 0),
  min_quantity numeric(12,3) not null default 0 check (min_quantity >= 0), max_quantity numeric(12,3), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id), updated_by uuid references auth.users(id), unique (clinic_id, sku)
);
create table if not exists public.clinic_inventory_lots (
  id uuid primary key default gen_random_uuid(), inventory_item_id uuid not null references public.clinic_inventory_items(id), batch_code text, expires_on date,
  quantity numeric(12,3) not null default 0 check (quantity >= 0), created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create table if not exists public.clinic_inventory_movements (
  id uuid primary key default gen_random_uuid(), inventory_item_id uuid not null references public.clinic_inventory_items(id), inventory_lot_id uuid references public.clinic_inventory_lots(id),
  movement_type text not null check (movement_type in ('entry', 'exit', 'adjustment')), quantity_delta numeric(12,3) not null check (quantity_delta <> 0),
  previous_quantity numeric(12,3) not null, resulting_quantity numeric(12,3) not null check (resulting_quantity >= 0), reason text,
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now(), created_by uuid references auth.users(id)
);
create index if not exists clinic_inventory_items_scope_idx on public.clinic_inventory_items(clinic_id, is_active, name);
create index if not exists clinic_inventory_lots_expiry_idx on public.clinic_inventory_lots(inventory_item_id, expires_on);
create index if not exists clinic_inventory_movements_item_idx on public.clinic_inventory_movements(inventory_item_id, occurred_at desc);

grant select, insert, update on public.clinic_inventory_items, public.clinic_inventory_lots, public.clinic_inventory_movements to authenticated;
alter table public.clinic_inventory_items enable row level security;
alter table public.clinic_inventory_lots enable row level security;
alter table public.clinic_inventory_movements enable row level security;
create policy inventory_items_read on public.clinic_inventory_items for select to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'inventory.read'));
create policy inventory_items_write on public.clinic_inventory_items for insert to authenticated with check (private.has_clinic_permission(organization_id, clinic_id, 'inventory.manage'));
create policy inventory_items_update on public.clinic_inventory_items for update to authenticated using (private.has_clinic_permission(organization_id, clinic_id, 'inventory.manage')) with check (private.has_clinic_permission(organization_id, clinic_id, 'inventory.manage'));
create policy inventory_lots_read on public.clinic_inventory_lots for select to authenticated using (exists(select 1 from public.clinic_inventory_items i where i.id = inventory_item_id and private.has_clinic_permission(i.organization_id, i.clinic_id, 'inventory.read')));
create policy inventory_lots_write on public.clinic_inventory_lots for insert to authenticated with check (exists(select 1 from public.clinic_inventory_items i where i.id = inventory_item_id and private.has_clinic_permission(i.organization_id, i.clinic_id, 'inventory.manage')));
create policy inventory_lots_update on public.clinic_inventory_lots for update to authenticated using (exists(select 1 from public.clinic_inventory_items i where i.id = inventory_item_id and private.has_clinic_permission(i.organization_id, i.clinic_id, 'inventory.manage'))) with check (exists(select 1 from public.clinic_inventory_items i where i.id = inventory_item_id and private.has_clinic_permission(i.organization_id, i.clinic_id, 'inventory.manage')));
create policy inventory_movements_read on public.clinic_inventory_movements for select to authenticated using (exists(select 1 from public.clinic_inventory_items i where i.id = inventory_item_id and private.has_clinic_permission(i.organization_id, i.clinic_id, 'inventory.read')));
create policy inventory_movements_insert on public.clinic_inventory_movements for insert to authenticated with check (exists(select 1 from public.clinic_inventory_items i where i.id = inventory_item_id and private.has_clinic_permission(i.organization_id, i.clinic_id, 'inventory.manage')));

create or replace function public.record_clinic_inventory_movement(target_item_id uuid, target_lot_id uuid, target_movement_type text, target_quantity_delta numeric, target_reason text default null)
returns public.clinic_inventory_movements language plpgsql security invoker set search_path = public, private as $$
declare item public.clinic_inventory_items; lot public.clinic_inventory_lots; movement public.clinic_inventory_movements; next_quantity numeric;
begin
  if target_movement_type not in ('entry', 'exit', 'adjustment') or target_quantity_delta = 0 then raise exception 'Invalid inventory movement'; end if;
  select * into item from public.clinic_inventory_items where id = target_item_id for update;
  if not found or not private.has_clinic_permission(item.organization_id, item.clinic_id, 'inventory.manage') then raise exception 'Inventory item unavailable'; end if;
  next_quantity := item.current_quantity + target_quantity_delta;
  if next_quantity < 0 then raise exception 'Insufficient inventory quantity'; end if;
  if target_lot_id is not null then
    select * into lot from public.clinic_inventory_lots where id = target_lot_id and inventory_item_id = item.id for update;
    if not found or lot.quantity + target_quantity_delta < 0 then raise exception 'Inventory lot unavailable'; end if;
    update public.clinic_inventory_lots set quantity = lot.quantity + target_quantity_delta where id = lot.id;
  end if;
  update public.clinic_inventory_items set current_quantity = next_quantity, updated_at = now(), updated_by = auth.uid() where id = item.id;
  insert into public.clinic_inventory_movements(inventory_item_id, inventory_lot_id, movement_type, quantity_delta, previous_quantity, resulting_quantity, reason, created_by)
  values(item.id, target_lot_id, target_movement_type, target_quantity_delta, item.current_quantity, next_quantity, target_reason, auth.uid()) returning * into movement;
  return movement;
end;
$$;
revoke all on function public.record_clinic_inventory_movement(uuid, uuid, text, numeric, text) from public;
grant execute on function public.record_clinic_inventory_movement(uuid, uuid, text, numeric, text) to authenticated;
