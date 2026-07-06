import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useUnitHierarchy, useUnitBlocks, useBlockSectors, useSectorSubspaces } from "@/hooks/useAssets";

interface Props {
  unitId?: string | null;
  buildingId?: string | null;
  sectorId?: string | null;
  subspaceId?: string | null;
  onChange: (v: { unit_id?: string | null; building_id?: string | null; sector_id?: string | null; subspace_id?: string | null }) => void;
  compact?: boolean;
}

export function AssetLocationSelector({ unitId, buildingId, sectorId, subspaceId, onChange, compact }: Props) {
  const { units } = useUnitHierarchy();
  const blocks = useUnitBlocks(unitId ?? undefined);
  const sectors = useBlockSectors(buildingId ?? undefined);
  const subspaces = useSectorSubspaces(sectorId ?? undefined);

  const cls = compact ? "grid grid-cols-1 md:grid-cols-4 gap-3" : "grid grid-cols-1 md:grid-cols-2 gap-4";

  return (
    <div className={cls}>
      <div className="space-y-2">
        <Label>Unidade *</Label>
        <Select value={unitId ?? ""} onValueChange={(v) => onChange({ unit_id: v || null, building_id: null, sector_id: null, subspace_id: null })}>
          <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
          <SelectContent>{(units.data ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Bloco</Label>
        <Select value={buildingId ?? ""} onValueChange={(v) => onChange({ unit_id: unitId, building_id: v || null, sector_id: null, subspace_id: null })} disabled={!unitId}>
          <SelectTrigger><SelectValue placeholder={unitId ? "Selecione o bloco" : "Selecione a unidade primeiro"} /></SelectTrigger>
          <SelectContent>{(blocks.data ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Sala / Setor</Label>
        <Select value={sectorId ?? ""} onValueChange={(v) => onChange({ unit_id: unitId, building_id: buildingId, sector_id: v || null, subspace_id: null })} disabled={!buildingId}>
          <SelectTrigger><SelectValue placeholder={buildingId ? "Selecione a sala/setor" : "Selecione o bloco primeiro"} /></SelectTrigger>
          <SelectContent>{(sectors.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Local específico</Label>
        <Select value={subspaceId ?? ""} onValueChange={(v) => onChange({ unit_id: unitId, building_id: buildingId, sector_id: sectorId, subspace_id: v || null })} disabled={!sectorId}>
          <SelectTrigger><SelectValue placeholder={sectorId ? "Selecione o local" : "Selecione a sala/setor primeiro"} /></SelectTrigger>
          <SelectContent>{(subspaces.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}
