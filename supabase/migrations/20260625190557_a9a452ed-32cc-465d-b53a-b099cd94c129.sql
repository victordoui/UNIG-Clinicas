
-- ========= Helper: who can manage units =========
CREATE OR REPLACE FUNCTION public.is_admin_unit_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    coalesce((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()), false)
    OR public.get_user_unig_role() IN ('administrador','coordenador_operacoes','gerente_geral')
$$;

-- ========= units =========
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  short_name text,
  emoji text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 999,
  type text,
  icon text,
  color text,
  address text,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS units_display_order_idx
  ON public.units (is_active DESC, display_order ASC, name ASC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_select_authenticated"
  ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units_insert_admin"
  ON public.units FOR INSERT TO authenticated WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "units_update_admin"
  ON public.units FOR UPDATE TO authenticated USING (public.is_admin_unit_manager()) WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "units_delete_admin"
  ON public.units FOR DELETE TO authenticated USING (public.is_admin_unit_manager());

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= hierarchy: unit_blocks =========
CREATE TABLE IF NOT EXISTS public.unit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 999,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, name)
);
CREATE INDEX IF NOT EXISTS unit_blocks_unit_id_idx ON public.unit_blocks (unit_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_blocks TO authenticated;
GRANT ALL ON public.unit_blocks TO service_role;
ALTER TABLE public.unit_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unit_blocks_select" ON public.unit_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "unit_blocks_insert" ON public.unit_blocks FOR INSERT TO authenticated WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_blocks_update" ON public.unit_blocks FOR UPDATE TO authenticated USING (public.is_admin_unit_manager()) WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_blocks_delete" ON public.unit_blocks FOR DELETE TO authenticated USING (public.is_admin_unit_manager());
CREATE TRIGGER trg_unit_blocks_updated_at BEFORE UPDATE ON public.unit_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= unit_floors =========
CREATE TABLE IF NOT EXISTS public.unit_floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.unit_blocks(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 999,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_id, name)
);
CREATE INDEX IF NOT EXISTS unit_floors_block_id_idx ON public.unit_floors (block_id, display_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_floors TO authenticated;
GRANT ALL ON public.unit_floors TO service_role;
ALTER TABLE public.unit_floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unit_floors_select" ON public.unit_floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "unit_floors_insert" ON public.unit_floors FOR INSERT TO authenticated WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_floors_update" ON public.unit_floors FOR UPDATE TO authenticated USING (public.is_admin_unit_manager()) WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_floors_delete" ON public.unit_floors FOR DELETE TO authenticated USING (public.is_admin_unit_manager());
CREATE TRIGGER trg_unit_floors_updated_at BEFORE UPDATE ON public.unit_floors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= unit_sectors =========
CREATE TABLE IF NOT EXISTS public.unit_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id uuid NOT NULL REFERENCES public.unit_floors(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 999,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (floor_id, name)
);
CREATE INDEX IF NOT EXISTS unit_sectors_floor_id_idx ON public.unit_sectors (floor_id, display_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_sectors TO authenticated;
GRANT ALL ON public.unit_sectors TO service_role;
ALTER TABLE public.unit_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unit_sectors_select" ON public.unit_sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "unit_sectors_insert" ON public.unit_sectors FOR INSERT TO authenticated WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_sectors_update" ON public.unit_sectors FOR UPDATE TO authenticated USING (public.is_admin_unit_manager()) WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_sectors_delete" ON public.unit_sectors FOR DELETE TO authenticated USING (public.is_admin_unit_manager());
CREATE TRIGGER trg_unit_sectors_updated_at BEFORE UPDATE ON public.unit_sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= unit_subspaces =========
CREATE TABLE IF NOT EXISTS public.unit_subspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES public.unit_sectors(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 999,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector_id, name)
);
CREATE INDEX IF NOT EXISTS unit_subspaces_sector_id_idx ON public.unit_subspaces (sector_id, display_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_subspaces TO authenticated;
GRANT ALL ON public.unit_subspaces TO service_role;
ALTER TABLE public.unit_subspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unit_subspaces_select" ON public.unit_subspaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "unit_subspaces_insert" ON public.unit_subspaces FOR INSERT TO authenticated WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_subspaces_update" ON public.unit_subspaces FOR UPDATE TO authenticated USING (public.is_admin_unit_manager()) WITH CHECK (public.is_admin_unit_manager());
CREATE POLICY "unit_subspaces_delete" ON public.unit_subspaces FOR DELETE TO authenticated USING (public.is_admin_unit_manager());
CREATE TRIGGER trg_unit_subspaces_updated_at BEFORE UPDATE ON public.unit_subspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= Seed from organizations =========
INSERT INTO public.units (name, display_order, type, is_active)
SELECT o.name,
       (row_number() OVER (ORDER BY o.created_at ASC))::int * 10,
       'campus',
       true
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.units u WHERE u.name = o.name)
ON CONFLICT (name) DO NOTHING;
