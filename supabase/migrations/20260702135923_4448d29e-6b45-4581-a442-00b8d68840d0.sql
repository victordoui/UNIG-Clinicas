
-- Enums
DO $$ BEGIN
  CREATE TYPE public.asset_status AS ENUM ('ativo','em_uso','em_manutencao','reserva','danificado','sem_localizacao','transferido','baixado','extraviado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_condition AS ENUM ('novo','bom','regular','ruim','inservivel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Categorias
CREATE TABLE IF NOT EXISTS public.asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_categories TO service_role;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_categories_read_authenticated" ON public.asset_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "asset_categories_write_authenticated" ON public.asset_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tipos
CREATE TABLE IF NOT EXISTS public.asset_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.asset_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_types TO authenticated;
GRANT ALL ON public.asset_types TO service_role;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_types_read_authenticated" ON public.asset_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "asset_types_write_authenticated" ON public.asset_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Assets
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  asset_number text NOT NULL,
  internal_code text,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  type_id uuid REFERENCES public.asset_types(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.unit_blocks(id) ON DELETE SET NULL,
  floor_id uuid REFERENCES public.unit_floors(id) ON DELETE SET NULL,
  sector_id uuid REFERENCES public.unit_sectors(id) ON DELETE SET NULL,
  subspace_id uuid REFERENCES public.unit_subspaces(id) ON DELETE SET NULL,
  specific_location text,
  brand text,
  model text,
  serial_number text,
  color text,
  material text,
  status public.asset_status NOT NULL DEFAULT 'ativo',
  physical_condition public.asset_condition NOT NULL DEFAULT 'bom',
  responsible_sector_id uuid,
  responsible_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsible_team text,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_order_id uuid,
  invoice_number text,
  acquisition_date date,
  acquisition_value numeric(14,2),
  warranty_until date,
  has_preventive_maintenance boolean NOT NULL DEFAULT false,
  preventive_frequency text,
  last_maintenance_date date,
  next_maintenance_date date,
  qr_code uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  main_photo_url text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (organization_id, asset_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_read_org_members" ON public.assets
  FOR SELECT TO authenticated USING (
    organization_id IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid() AND m.organization_id = assets.organization_id AND m.is_active = true
    )
  );
CREATE POLICY "assets_write_org_members" ON public.assets
  FOR ALL TO authenticated USING (
    organization_id IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid() AND m.organization_id = assets.organization_id AND m.is_active = true
    )
  ) WITH CHECK (
    organization_id IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.user_id = auth.uid() AND m.organization_id = assets.organization_id AND m.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_assets_unit ON public.assets(unit_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category_id);

-- Movimentações
CREATE TABLE IF NOT EXISTS public.asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  from_unit_id uuid, from_building_id uuid, from_sector_id uuid, from_subspace_id uuid,
  to_unit_id uuid, to_building_id uuid, to_sector_id uuid, to_subspace_id uuid,
  movement_type text NOT NULL DEFAULT 'transferencia',
  reason text,
  responsible_user_id uuid,
  moved_by uuid,
  movement_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_movements TO authenticated;
GRANT ALL ON public.asset_movements TO service_role;
ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_movements_all_auth" ON public.asset_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Manutenções
CREATE TABLE IF NOT EXISTS public.asset_maintenance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL,
  related_ticket_id uuid,
  description text,
  cost numeric(14,2),
  maintenance_date date NOT NULL DEFAULT current_date,
  next_maintenance_date date,
  performed_by text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_maintenance_history TO authenticated;
GRANT ALL ON public.asset_maintenance_history TO service_role;
ALTER TABLE public.asset_maintenance_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_maint_all_auth" ON public.asset_maintenance_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Documentos
CREATE TABLE IF NOT EXISTS public.asset_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  document_type text,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_documents TO authenticated;
GRANT ALL ON public.asset_documents TO service_role;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_docs_all_auth" ON public.asset_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inventário
CREATE TABLE IF NOT EXISTS public.asset_inventory_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  inventory_batch_id uuid,
  expected_unit_id uuid,
  expected_subspace_id uuid,
  found_unit_id uuid,
  found_subspace_id uuid,
  was_found boolean NOT NULL DEFAULT true,
  condition_found public.asset_condition,
  checked_by uuid,
  checked_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_inventory_checks TO authenticated;
GRANT ALL ON public.asset_inventory_checks TO service_role;
ALTER TABLE public.asset_inventory_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_inv_all_auth" ON public.asset_inventory_checks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Import batches
CREATE TABLE IF NOT EXISTS public.asset_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  file_name text NOT NULL,
  imported_by uuid,
  imported_at timestamptz NOT NULL DEFAULT now(),
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  errors_log jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_import_batches TO authenticated;
GRANT ALL ON public.asset_import_batches TO service_role;
ALTER TABLE public.asset_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_imp_all_auth" ON public.asset_import_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trg_assets_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS assets_touch ON public.assets;
CREATE TRIGGER assets_touch BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.trg_assets_touch();

-- Trigger movimentação automática
CREATE OR REPLACE FUNCTION public.trg_assets_log_movement()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' AND (
    COALESCE(OLD.unit_id::text,'') <> COALESCE(NEW.unit_id::text,'') OR
    COALESCE(OLD.building_id::text,'') <> COALESCE(NEW.building_id::text,'') OR
    COALESCE(OLD.sector_id::text,'') <> COALESCE(NEW.sector_id::text,'') OR
    COALESCE(OLD.subspace_id::text,'') <> COALESCE(NEW.subspace_id::text,'')
  ) THEN
    INSERT INTO public.asset_movements(asset_id, from_unit_id, from_building_id, from_sector_id, from_subspace_id,
      to_unit_id, to_building_id, to_sector_id, to_subspace_id, movement_type, moved_by)
    VALUES (NEW.id, OLD.unit_id, OLD.building_id, OLD.sector_id, OLD.subspace_id,
      NEW.unit_id, NEW.building_id, NEW.sector_id, NEW.subspace_id, 'transferencia', auth.uid());
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS assets_log_movement ON public.assets;
CREATE TRIGGER assets_log_movement AFTER UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.trg_assets_log_movement();

-- RPC pública QR
CREATE OR REPLACE FUNCTION public.get_asset_by_qr(_qr uuid)
RETURNS TABLE (id uuid, asset_number text, name text, description text, brand text, model text, unit_name text, status public.asset_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.id, a.asset_number, a.name, a.description, a.brand, a.model, u.name, a.status
  FROM public.assets a LEFT JOIN public.units u ON u.id=a.unit_id
  WHERE a.qr_code=_qr AND a.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.get_asset_by_qr(uuid) TO anon, authenticated;

-- Seed categorias
INSERT INTO public.asset_categories(name, icon, color, display_order) VALUES
  ('Climatização','Wind','#3B82F6',1),
  ('Bebedouros e Purificadores','Droplet','#06B6D4',2),
  ('Mobiliário','Armchair','#8B5CF6',3),
  ('Tecnologia / TI','Monitor','#0EA5E9',4),
  ('Audiovisual','Projector','#F59E0B',5),
  ('Copa e Eletrodomésticos','Refrigerator','#EF4444',6),
  ('Elétrico / Energia','Zap','#EAB308',7),
  ('Manutenção Predial','Wrench','#64748B',8),
  ('Segurança','Shield','#DC2626',9),
  ('Hidráulico','Pipette','#0891B2',10),
  ('Equipamentos Administrativos','Briefcase','#6366F1',11),
  ('Equipamentos Acadêmicos','GraduationCap','#10B981',12),
  ('Outros','Package','#6B7280',99)
ON CONFLICT DO NOTHING;
