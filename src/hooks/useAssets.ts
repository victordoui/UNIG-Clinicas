import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const sb = supabase as any;

export type AssetStatus =
  | "ativo" | "em_uso" | "em_manutencao" | "reserva" | "danificado"
  | "sem_localizacao" | "transferido" | "baixado" | "extraviado";
export type AssetCondition = "novo" | "bom" | "regular" | "ruim" | "inservivel";

export interface Asset {
  id: string;
  asset_number: string;
  internal_code?: string | null;
  name: string;
  description?: string | null;
  category_id?: string | null;
  type_id?: string | null;
  unit_id?: string | null;
  building_id?: string | null;
  floor_id?: string | null;
  sector_id?: string | null;
  subspace_id?: string | null;
  specific_location?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  color?: string | null;
  material?: string | null;
  status: AssetStatus;
  physical_condition: AssetCondition;
  responsible_user_id?: string | null;
  responsible_team?: string | null;
  cost_center_id?: string | null;
  supplier_id?: string | null;
  invoice_number?: string | null;
  acquisition_date?: string | null;
  acquisition_value?: number | null;
  warranty_until?: string | null;
  has_preventive_maintenance?: boolean;
  preventive_frequency?: string | null;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;
  qr_code: string;
  main_photo_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  category?: { name: string; color?: string; icon?: string } | null;
  type?: { name: string } | null;
  unit?: { name: string } | null;
  building?: { name: string } | null;
  sector?: { name: string } | null;
  subspace?: { name: string } | null;
  responsible?: { full_name: string } | null;
}

export interface AssetFilters {
  unitId?: string;
  buildingId?: string;
  sectorId?: string;
  subspaceId?: string;
  categoryId?: string;
  typeId?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  responsibleId?: string;
  search?: string;
  valueMin?: number;
  valueMax?: number;
  acquisitionFrom?: string; // ISO date
  acquisitionTo?: string;   // ISO date
}


const SELECT = `
  *,
  category:asset_categories(name,color,icon),
  type:asset_types(name),
  unit:units(name),
  building:unit_blocks(name),
  sector:unit_sectors(name),
  subspace:unit_subspaces(name),
  responsible:profiles!assets_responsible_user_id_fkey(full_name)
`;

export interface AssetSummaryRow {
  id: string;
  status: AssetStatus;
  physical_condition: AssetCondition;
  acquisition_value: number | null;
  acquisition_date: string | null;
  category_id: string | null;
  type_id: string | null;
  unit_id: string | null;
  responsible_user_id: string | null;
  asset_number: string | null;
  building_id: string | null;
  sector_id: string | null;
  subspace_id: string | null;
  updated_at: string;
}


const SUMMARY_COLS =
  "id,status,physical_condition,acquisition_value,acquisition_date,category_id,type_id,unit_id,responsible_user_id,asset_number,building_id,sector_id,subspace_id,updated_at";


export function useAssetsSummary(filters: AssetFilters = {}) {
  return useQuery<{ rows: AssetSummaryRow[]; total: number }>({
    queryKey: ["assets_summary", filters],
    queryFn: async () => {
      const PAGE = 1000;
      const buildBase = (withCount: boolean) => {
        let q = withCount
          ? sb.from("assets").select(SUMMARY_COLS, { count: "exact" })
          : sb.from("assets").select(SUMMARY_COLS);
        q = q.is("deleted_at", null);
        if (filters.unitId) q = q.eq("unit_id", filters.unitId);
        if (filters.buildingId) q = q.eq("building_id", filters.buildingId);
        if (filters.sectorId) q = q.eq("sector_id", filters.sectorId);
        if (filters.subspaceId) q = q.eq("subspace_id", filters.subspaceId);
        if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
        if (filters.typeId) q = q.eq("type_id", filters.typeId);
        if (filters.status) q = q.eq("status", filters.status);
        if (filters.condition) q = q.eq("physical_condition", filters.condition);
        if (filters.responsibleId) q = q.eq("responsible_user_id", filters.responsibleId);
        if (typeof filters.valueMin === "number") q = q.gte("acquisition_value", filters.valueMin);
        if (typeof filters.valueMax === "number") q = q.lte("acquisition_value", filters.valueMax);
        if (filters.acquisitionFrom) q = q.gte("acquisition_date", filters.acquisitionFrom);
        if (filters.acquisitionTo) q = q.lte("acquisition_date", filters.acquisitionTo);
        if (filters.search) {
          q = q.or(
            `name.ilike.%${filters.search}%,asset_number.ilike.%${filters.search}%,internal_code.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
          );
        }
        return q;

      };

      const first = await buildBase(true).range(0, PAGE - 1);
      if (first.error) throw first.error;
      const rows: AssetSummaryRow[] = [...((first.data ?? []) as AssetSummaryRow[])];
      const total = first.count ?? rows.length;

      let page = 1;
      while (rows.length < total) {
        const from = page * PAGE;
        const to = from + PAGE - 1;
        const { data, error } = await buildBase(false).range(from, to);
        if (error) throw error;
        const batch = (data ?? []) as AssetSummaryRow[];
        if (!batch.length) break;
        rows.push(...batch);
        if (batch.length < PAGE) break;
        page += 1;
      }

      return { rows, total };
    },
  });
}

export interface AggregateBucket {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  count: number;
  value: number;
  pct: number;
}

export interface DuplicateGroup {
  asset_number: string;
  count: number;
  ids: string[];
}

export interface AssetsAggregates {
  total: number;
  totalValue: number;
  byStatus: Record<string, number>;
  byCondition: Record<string, number>;
  byCategory: AggregateBucket[];
  byUnit: AggregateBucket[];
  byAcquisitionYear: { year: string; count: number; value: number }[];
  byConditionStatus: { condition: string; [status: string]: number | string }[];

  pending: {
    semLocalizacao: number;
    semResponsavel: number;
    semCategoria: number;
    semValor: number;
    semNumero: number;
    semTipo: number;
    semCondicao: number;
    semStatus: number;
    semUnidade: number;
    valorZerado: number;
    danificados: number;
    emManutencao: number;
    baixados: number;
    duplicados: number;
  };
  duplicates: DuplicateGroup[];
  categoriesCount: number;
  unitsWithAssets: number;
  topCategory: AggregateBucket | null;
  lastUpdated: string | null;
}

export function useAssetsAggregates(filters: AssetFilters = {}) {
  const summary = useAssetsSummary(filters);
  const categories = useAssetCategories();
  const { units } = useUnitHierarchy();

  const rows = summary.data?.rows ?? [];
  const total = summary.data?.total ?? 0;
  const cats: any[] = (categories.data as any[]) ?? [];
  const uns: any[] = (units.data as any[]) ?? [];

  const catMap = new Map(cats.map((c) => [c.id, c]));
  const unitMap = new Map(uns.map((u) => [u.id, u]));

  const byStatus: Record<string, number> = {};
  const byCondition: Record<string, number> = {};
  const catCount = new Map<string, { count: number; value: number }>();
  const unitCount = new Map<string, { count: number; value: number }>();

  let totalValue = 0;
  const pending = {
    semLocalizacao: 0, semResponsavel: 0, semCategoria: 0,
    semValor: 0, semNumero: 0, semTipo: 0, semCondicao: 0, semStatus: 0,
    semUnidade: 0, valorZerado: 0,
    danificados: 0, emManutencao: 0, baixados: 0, duplicados: 0,
  };
  let lastUpdated: string | null = null;
  const numGroups = new Map<string, string[]>();
  const yearMap = new Map<string, { count: number; value: number }>();
  const condStatusMap = new Map<string, Map<string, number>>();


  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byCondition[r.physical_condition] = (byCondition[r.physical_condition] ?? 0) + 1;
    const v = Number(r.acquisition_value ?? 0);
    totalValue += v;

    const cid = r.category_id ?? "__none__";
    const c = catCount.get(cid) ?? { count: 0, value: 0 };
    c.count++; c.value += v; catCount.set(cid, c);

    const uid = r.unit_id ?? "__none__";
    const u = unitCount.get(uid) ?? { count: 0, value: 0 };
    u.count++; u.value += v; unitCount.set(uid, u);

    if (!r.building_id && !r.sector_id && !r.subspace_id) pending.semLocalizacao++;
    if (!r.responsible_user_id) pending.semResponsavel++;
    if (!r.category_id) pending.semCategoria++;
    if (r.acquisition_value == null) pending.semValor++;
    else if (Number(r.acquisition_value) === 0) pending.valorZerado++;
    if (!r.asset_number) pending.semNumero++;
    if (!(r as any).type_id) pending.semTipo++;
    if (!r.physical_condition) pending.semCondicao++;
    if (!r.status) pending.semStatus++;
    if (!r.unit_id) pending.semUnidade++;
    if (r.status === "danificado") pending.danificados++;
    if (r.status === "em_manutencao") pending.emManutencao++;
    if (r.status === "baixado") pending.baixados++;
    if (!lastUpdated || r.updated_at > lastUpdated) lastUpdated = r.updated_at;

    if (r.asset_number) {
      const arr = numGroups.get(r.asset_number) ?? [];
      arr.push(r.id);
      numGroups.set(r.asset_number, arr);
    }

    const yr = r.acquisition_date ? String(r.acquisition_date).slice(0, 4) : "Sem data";
    const yb = yearMap.get(yr) ?? { count: 0, value: 0 };
    yb.count++; yb.value += v; yearMap.set(yr, yb);

    const cond = r.physical_condition ?? "sem";
    const inner = condStatusMap.get(cond) ?? new Map<string, number>();
    inner.set(r.status ?? "sem", (inner.get(r.status ?? "sem") ?? 0) + 1);
    condStatusMap.set(cond, inner);
  }


  const duplicates: DuplicateGroup[] = [];
  for (const [asset_number, ids] of numGroups) {
    if (ids.length > 1) {
      duplicates.push({ asset_number, count: ids.length, ids });
      pending.duplicados += ids.length;
    }
  }
  duplicates.sort((a, b) => b.count - a.count);

  const byCategory: AggregateBucket[] = [...catCount.entries()]
    .map(([id, v]) => {
      const c = catMap.get(id);
      return {
        id,
        name: c?.name ?? "Sem categoria",
        color: c?.color ?? null,
        icon: c?.icon ?? null,
        count: v.count,
        value: v.value,
        pct: total ? (v.count / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const byUnit: AggregateBucket[] = [...unitCount.entries()]
    .map(([id, v]) => {
      const u = unitMap.get(id);
      return {
        id,
        name: u?.name ?? "Sem unidade",
        color: null,
        icon: null,
        count: v.count,
        value: v.value,
        pct: total ? (v.count / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const byAcquisitionYear = [...yearMap.entries()]
    .map(([year, v]) => ({ year, count: v.count, value: v.value }))
    .sort((a, b) => (a.year < b.year ? -1 : 1));

  const byConditionStatus = [...condStatusMap.entries()].map(([condition, inner]) => {
    const row: any = { condition };
    for (const [st, n] of inner) row[st] = n;
    return row;
  });

  const aggregates: AssetsAggregates = {
    total,
    totalValue,
    byStatus,
    byCondition,
    byCategory,
    byUnit,
    byAcquisitionYear,
    byConditionStatus,
    pending,
    duplicates,
    categoriesCount: byCategory.filter((c) => c.id !== "__none__").length,
    unitsWithAssets: byUnit.filter((u) => u.id !== "__none__").length,
    topCategory: byCategory[0] ?? null,
    lastUpdated,
  };

  return { aggregates, isLoading: summary.isLoading, isFetching: summary.isFetching };
}





export function useAssets(filters: AssetFilters = {}) {
  return useQuery<Asset[]>({
    queryKey: ["assets", filters],
    queryFn: async () => {
      let q = sb.from("assets").select(SELECT).is("deleted_at", null).order("created_at", { ascending: false });
      if (filters.unitId) q = q.eq("unit_id", filters.unitId);
      if (filters.buildingId) q = q.eq("building_id", filters.buildingId);
      if (filters.sectorId) q = q.eq("sector_id", filters.sectorId);
      if (filters.subspaceId) q = q.eq("subspace_id", filters.subspaceId);
      if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
      if (filters.typeId) q = q.eq("type_id", filters.typeId);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.condition) q = q.eq("physical_condition", filters.condition);
      if (filters.responsibleId) q = q.eq("responsible_user_id", filters.responsibleId);
      if (typeof filters.valueMin === "number") q = q.gte("acquisition_value", filters.valueMin);
      if (typeof filters.valueMax === "number") q = q.lte("acquisition_value", filters.valueMax);
      if (filters.acquisitionFrom) q = q.gte("acquisition_date", filters.acquisitionFrom);
      if (filters.acquisitionTo) q = q.lte("acquisition_date", filters.acquisitionTo);
      if (filters.search) {
        q = q.or(
          `name.ilike.%${filters.search}%,asset_number.ilike.%${filters.search}%,internal_code.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAsset(id?: string) {
  return useQuery<Asset | null>({
    queryKey: ["asset", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from("assets").select(SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAssetMovements(assetId?: string) {
  return useQuery({
    queryKey: ["asset_movements", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await sb.from("asset_movements")
        .select("*")
        .eq("asset_id", assetId)
        .order("movement_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssetMaintenance(assetId?: string) {
  return useQuery({
    queryKey: ["asset_maint", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await sb.from("asset_maintenance_history")
        .select("*")
        .eq("asset_id", assetId)
        .order("maintenance_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssetDocuments(assetId?: string) {
  return useQuery({
    queryKey: ["asset_docs", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await sb.from("asset_documents")
        .select("*").eq("asset_id", assetId).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Asset> & { id?: string }) => {
      const { id, category, type, unit, building, sector, subspace, responsible, ...rest } = payload as any;
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (id) {
        const { data, error } = await sb.from("assets").update({ ...rest, updated_by: uid }).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await sb.from("assets").insert({ ...rest, created_by: uid, updated_by: uid }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["asset"] });
      toast({ title: "Patrimônio salvo com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });
}

export function useSoftDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("assets").update({ deleted_at: new Date().toISOString(), status: "baixado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast({ title: "Patrimônio baixado" });
    },
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ["asset_categories"],
    queryFn: async () => {
      const { data, error } = await sb.from("asset_categories")
        .select("*").eq("is_active", true).order("display_order").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssetTypes(categoryId?: string) {
  return useQuery({
    queryKey: ["asset_types", categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await sb.from("asset_types")
        .select("*").eq("category_id", categoryId).eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...rest } = payload;
      if (id) {
        const { data, error } = await sb.from("asset_categories").update(rest).eq("id", id).select().single();
        if (error) throw error; return data;
      }
      const { data, error } = await sb.from("asset_categories").insert(rest).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["asset_categories"] }); toast({ title: "Categoria salva" }); },
  });
}

export function useSaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...rest } = payload;
      if (id) {
        const { data, error } = await sb.from("asset_types").update(rest).eq("id", id).select().single();
        if (error) throw error; return data;
      }
      const { data, error } = await sb.from("asset_types").insert(rest).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["asset_types"] }); toast({ title: "Tipo salvo" }); },
  });
}

export function useUnitHierarchy() {
  const units = useQuery({
    queryKey: ["units-all"],
    queryFn: async () => {
      const { data } = await sb.from("units").select("id,name").eq("is_active", true).order("display_order").order("name");
      return data ?? [];
    },
  });
  return { units };
}

export function useUnitBlocks(unitId?: string) {
  return useQuery({
    queryKey: ["unit_blocks", unitId], enabled: !!unitId,
    queryFn: async () => {
      const { data } = await sb.from("unit_blocks").select("id,name").eq("unit_id", unitId).order("display_order").order("name");
      return data ?? [];
    },
  });
}

export function useBlockSectors(blockId?: string) {
  return useQuery({
    queryKey: ["block_sectors_via_floors", blockId], enabled: !!blockId,
    queryFn: async () => {
      const { data: floors } = await sb.from("unit_floors").select("id").eq("block_id", blockId);
      const floorIds = (floors ?? []).map((f: any) => f.id);
      if (!floorIds.length) return [];
      const { data } = await sb.from("unit_sectors").select("id,name,floor_id").in("floor_id", floorIds).order("name");
      return data ?? [];
    },
  });
}

export function useSectorSubspaces(sectorId?: string) {
  return useQuery({
    queryKey: ["sector_subspaces", sectorId], enabled: !!sectorId,
    queryFn: async () => {
      const { data } = await sb.from("unit_subspaces").select("id,name").eq("sector_id", sectorId).order("name");
      return data ?? [];
    },
  });
}
