import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package, Plus, Eye, Pencil, ArrowLeftRight, Wrench, QrCode, Archive, MoreHorizontal,
  Tag, Upload, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download, ListChecks,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useAssets, useSoftDeleteAsset, useAssetsAggregates, type AssetFilters as F, type Asset } from "@/hooks/useAssets";
import { AssetFiltersBar } from "@/components/patrimonio/AssetFilters";
import { AssetStatusBadge, AssetConditionBadge } from "@/components/patrimonio/AssetStatusBadge";
import { format } from "date-fns";

type PageSize = 100 | 500 | 1000 | "all";
type SortKey = "asset_number" | "name" | "category" | "unit" | "status" | "condition" | "value" | "updated";
type SortDir = "asc" | "desc";
type PendingKey =
  | "sem_localizacao" | "sem_responsavel" | "sem_categoria" | "sem_valor"
  | "sem_numero" | "sem_tipo" | "sem_condicao" | "sem_unidade"
  | "valor_zerado" | "duplicados";

const brl = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PatrimonioItens() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [filters, setFilters] = useState<F>({});
  const [pendingKey, setPendingKey] = useState<PendingKey | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>(100);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Read query string once (unit/status/search/filter)
  useEffect(() => {
    const unit = sp.get("unit");
    const status = sp.get("status");
    const search = sp.get("search");
    const filter = sp.get("filter") as PendingKey | null;
    const patch: F = {};
    if (unit) patch.unitId = unit;
    if (status) patch.status = status as any;
    if (search) patch.search = search;
    if (Object.keys(patch).length) setFilters((f) => ({ ...f, ...patch }));
    if (filter) setPendingKey(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPage(1); }, [filters, pendingKey, pageSize, sortKey, sortDir]);

  const { data: assets = [], isLoading } = useAssets(filters);
  const { aggregates } = useAssetsAggregates(filters);
  const softDelete = useSoftDeleteAsset();

  const dupNumbers = useMemo(() => {
    const s = new Set<string>();
    aggregates.duplicates.forEach((d) => s.add(d.asset_number));
    return s;
  }, [aggregates.duplicates]);

  const filteredAssets = useMemo(() => {
    if (!pendingKey) return assets;
    return assets.filter((a: Asset) => {
      switch (pendingKey) {
        case "sem_localizacao": return !a.building_id && !a.sector_id && !a.subspace_id;
        case "sem_responsavel": return !a.responsible_user_id;
        case "sem_categoria": return !a.category_id;
        case "sem_valor": return a.acquisition_value == null;
        case "valor_zerado": return a.acquisition_value != null && Number(a.acquisition_value) === 0;
        case "sem_numero": return !a.asset_number;
        case "sem_tipo": return !(a as any).type_id;
        case "sem_condicao": return !a.physical_condition;
        case "sem_unidade": return !a.unit_id;
        case "duplicados": return a.asset_number && dupNumbers.has(a.asset_number);
        default: return true;
      }
    });
  }, [assets, pendingKey, dupNumbers]);

  const sortedAssets = useMemo(() => {
    const arr = [...filteredAssets];
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (a: any): any => {
      switch (sortKey) {
        case "asset_number": return a.asset_number ?? "";
        case "name": return a.name ?? "";
        case "category": return a.category?.name ?? "";
        case "unit": return a.unit?.name ?? "";
        case "status": return a.status ?? "";
        case "condition": return a.physical_condition ?? "";
        case "value": return Number(a.acquisition_value ?? 0);
        case "updated": return a.updated_at ?? "";
      }
    };
    arr.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
    return arr;
  }, [filteredAssets, sortKey, sortDir]);

  const total = sortedAssets.length;
  const size = pageSize === "all" ? total || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * size;
  const end = pageSize === "all" ? total : Math.min(total, start + size);
  const pageRows = useMemo(() => sortedAssets.slice(start, end), [sortedAssets, start, end]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="h-3 w-3 opacity-40 inline ml-1" />
    : sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" />
    : <ArrowDown className="h-3 w-3 inline ml-1" />;

  const hasFilters = Object.values(filters).some(Boolean) || pendingKey != null;

  const pendingLabels: Record<PendingKey, string> = {
    sem_localizacao: "Sem localização",
    sem_responsavel: "Sem responsável",
    sem_categoria: "Sem categoria",
    sem_valor: "Sem valor",
    valor_zerado: "Valor zerado",
    sem_numero: "Sem nº patrimônio",
    sem_tipo: "Sem tipo",
    sem_condicao: "Sem condição",
    sem_unidade: "Sem unidade",
    duplicados: "Duplicados",
  };

  const clearAll = () => {
    setFilters({});
    setPendingKey(null);
    setSp({}, { replace: true });
  };

  const exportCsv = () => {
    const headers = ["Nº","Nome","Categoria","Unidade","Local","Status","Condição","Responsável","Valor","Atualizado"];
    const rows = sortedAssets.map((a) => [
      a.asset_number ?? "", a.name, a.category?.name ?? "", a.unit?.name ?? "",
      [a.building?.name, a.sector?.name, a.subspace?.name].filter(Boolean).join(" › "),
      a.status, a.physical_condition,
      a.responsible?.full_name ?? "",
      a.acquisition_value ?? "",
      a.updated_at,
    ]);
    const csv = [headers, ...rows].map((r) =>
      r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")
    ).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `itens-patrimonio-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          icon={ListChecks}
          title="Itens do Patrimônio"
          description="Consulte, filtre, organize e gerencie todos os bens patrimoniais cadastrados."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => nav("/patrimonio/importacao")} className="gap-2">
                <Upload className="h-4 w-4" /> Importar
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
                <Download className="h-4 w-4" /> Exportar
              </Button>
              <Button onClick={() => nav("/patrimonio/novo")} className="gap-2">
                <Plus className="h-4 w-4" /> Novo Patrimônio
              </Button>
            </div>
          }
        />

        <AssetFiltersBar value={filters} onChange={setFilters} />

        {pendingKey && (
          <div className="flex items-center justify-between text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <span>
              Filtro de saneamento aplicado: <strong className="text-primary">{pendingLabels[pendingKey]}</strong>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setPendingKey(null)}>Remover</Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground px-1 gap-1">
          <span>
            Exibindo <strong className="text-foreground">{total === 0 ? 0 : (start + 1).toLocaleString("pt-BR")}–{end.toLocaleString("pt-BR")}</strong> de <strong className="text-foreground">{total.toLocaleString("pt-BR")}</strong>
            {hasFilters && <span className="ml-1 text-primary">filtrados</span>}
          </span>
          <span>
            Total geral da base: <strong className="text-foreground">{aggregates.total.toLocaleString("pt-BR")}</strong>
            {hasFilters && <Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={clearAll}>Limpar tudo</Button>}
          </span>
        </div>

        <Card className="overflow-hidden p-0 rounded-xl">
          <div className="overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("asset_number")}>Nº Patrimônio<SortIcon k="asset_number" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>Nome / Descrição<SortIcon k="name" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("category")}>Categoria<SortIcon k="category" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("unit")}>Unidade<SortIcon k="unit" /></TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>Status<SortIcon k="status" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("condition")}>Condição<SortIcon k="condition" /></TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("value")}>Valor<SortIcon k="value" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("updated")}>Atualizado<SortIcon k="updated" /></TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
                ) : total === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum patrimônio encontrado com os filtros atuais.</p>
                    <Button className="mt-3 gap-2" variant="outline" onClick={clearAll}>Limpar filtros</Button>
                  </TableCell></TableRow>
                ) : pageRows.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => nav(`/patrimonio/${a.id}`)}>
                    <TableCell className="font-mono text-xs">{a.asset_number || <span className="text-muted-foreground italic">Sem nº</span>}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm">
                      {a.category ? (() => {
                        const Icon = ((a.category as any).icon && (LucideIcons as any)[(a.category as any).icon]) || Tag;
                        return (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="h-4 w-4 shrink-0" style={a.category.color ? { color: a.category.color } : undefined} />
                            <span>{a.category.name}</span>
                          </span>
                        );
                      })() : <span className="text-muted-foreground italic">Sem categoria</span>}
                    </TableCell>
                    <TableCell className="text-sm">{a.unit?.name ?? <span className="text-muted-foreground italic">Sem unidade</span>}</TableCell>
                    <TableCell className="text-sm">
                      {[a.building?.name, a.sector?.name, a.subspace?.name].filter(Boolean).join(" › ") || <span className="text-muted-foreground italic">Sem localização</span>}
                    </TableCell>
                    <TableCell><AssetStatusBadge status={a.status} /></TableCell>
                    <TableCell><AssetConditionBadge condition={a.physical_condition} /></TableCell>
                    <TableCell className="text-sm">{a.responsible?.full_name ?? <span className="text-muted-foreground italic">Sem responsável</span>}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{a.acquisition_value != null ? brl(a.acquisition_value) : <span className="text-muted-foreground italic">Sem valor</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(a.updated_at), "dd/MM/yy")}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => nav(`/patrimonio/${a.id}`)}><Eye className="h-4 w-4 mr-2" />Visualizar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => nav(`/patrimonio/${a.id}/editar`)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => nav(`/patrimonio/${a.id}?tab=historico`)}><ArrowLeftRight className="h-4 w-4 mr-2" />Movimentações</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => nav(`/patrimonio/${a.id}?tab=manutencoes`)}><Wrench className="h-4 w-4 mr-2" />Manutenção</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/p/${a.qr_code}`, "_blank")}><QrCode className="h-4 w-4 mr-2" />Ver QR Code</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => { if (confirm("Baixar este patrimônio?")) softDelete.mutate(a.id); }}
                          >
                            <Archive className="h-4 w-4 mr-2" />Baixar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Itens por página:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(v === "all" ? "all" : (Number(v) as PageSize))}
                >
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {total === 0 ? "0" : `${(start + 1).toLocaleString("pt-BR")}–${end.toLocaleString("pt-BR")}`} de {total.toLocaleString("pt-BR")}
                </span>
                {pageSize !== "all" && (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
