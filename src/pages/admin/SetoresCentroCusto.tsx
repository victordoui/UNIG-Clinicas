import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  GitBranch,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { UserCostCenterLinks } from "@/components/purchases/UserCostCenterLinks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useBulkUpsertCostCenters,
  useCostCenters,
  useDeleteCostCenter,
  useLogCostCenterExport,
  useSetCostCenterStatus,
  useUpsertCostCenter,
  type CostCenter,
  type CostCenterInput,
} from "@/hooks/useCostCenters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";

type StatusFilter = "all" | "active" | "inactive";
type ImportStatus =
  | "Novo registro"
  | "Será atualizado"
  | "Duplicado"
  | "Erro de preenchimento"
  | "Unidade não encontrada"
  | "Classificação inválida";

interface ImportRow {
  rowNumber: number;
  data: CostCenterInput;
  status: ImportStatus;
  messages: string[];
  existingId?: string;
}

type CostCenterLinkedRow = { cost_center_id: string | null };
type CostCenterLinkedQuery = {
  select: (columns: string) => CostCenterLinkedQuery;
  eq: (column: string, value: string | undefined) => CostCenterLinkedQuery;
  not: (column: string, operator: string, value: null) => Promise<{ data: CostCenterLinkedRow[] | null; error: unknown }>;
};
type DynamicSupabase = {
  from: (table: string) => CostCenterLinkedQuery;
};

const EMPTY_FORM: CostCenterInput = {
  nome: "",
  codigo: "",
  classificacao: "",
  unidade_polo: "",
  campus: "",
  setor_departamento: "",
  ativo: true,
  observacoes: "",
};

const TEMPLATE_ROWS = [
  {
    "Nome do Centro de Custo": "Administração",
    "Centro de Custo": "10101",
    Classificação: "01.01.01",
    "Unidade / Polo Sintético": "Nova Iguaçu",
    "Campus / Unidade": "Nova Iguaçu",
    "Setor / Departamento": "Administração",
    Status: "Ativo",
    Observações: "Exemplo",
  },
  {
    "Nome do Centro de Custo": "Secretaria Geral",
    "Centro de Custo": "10304",
    Classificação: "01.03.04",
    "Unidade / Polo Sintético": "Nova Iguaçu",
    "Campus / Unidade": "Nova Iguaçu",
    "Setor / Departamento": "Secretaria Geral",
    Status: "Ativo",
    Observações: "Exemplo",
  },
  {
    "Nome do Centro de Custo": "Prefeitura do Campus",
    "Centro de Custo": "302",
    Classificação: "03.02",
    "Unidade / Polo Sintético": "Itaperuna",
    "Campus / Unidade": "Itaperuna",
    "Setor / Departamento": "Prefeitura do Campus",
    Status: "Ativo",
    Observações: "Exemplo",
  },
  {
    "Nome do Centro de Custo": "Reitoria",
    "Centro de Custo": "601",
    Classificação: "06.01",
    "Unidade / Polo Sintético": "Centro RJ",
    "Campus / Unidade": "Centro RJ",
    "Setor / Departamento": "Reitoria",
    Status: "Ativo",
    Observações: "Exemplo",
  },
];

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function keyOf(unidade: string | null | undefined, codigo: string | null | undefined) {
  return `${norm(unidade)}::${norm(codigo)}`;
}

function classificationOk(value: string | null | undefined) {
  return !!value?.trim() && /^\d+(\.\d+)*$/.test(value.trim());
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function readCell(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const found = entries.find(([key]) => norm(key) === norm(alias));
    if (found) return String(found[1] ?? "").trim();
  }
  return "";
}

export default function SetoresCentroCusto() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: centers = [], isLoading, refetch } = useCostCenters();
  const upsert = useUpsertCostCenter();
  const bulkUpsert = useBulkUpsertCostCenters();
  const setStatus = useSetCostCenterStatus();
  const remove = useDeleteCostCenter();
  const logExport = useLogCostCenterExport();

  const [search, setSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [classificationSearch, setClassificationSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [editing, setEditing] = useState<CostCenterInput | null>(null);
  const [viewing, setViewing] = useState<CostCenter | null>(null);
  const [linksFor, setLinksFor] = useState<CostCenter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCenter | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const linkedIdsQuery = useLinkedCostCenterIds(organization?.organization_id);
  const linkedIds = linkedIdsQuery.data ?? new Set<string>();

  const units = useMemo(() => {
    const values = new Set(["Nova Iguaçu", "Itaperuna", "Centro RJ"]);
    centers.forEach((item) => item.unidade_polo && values.add(item.unidade_polo));
    return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [centers]);

  const sectors = useMemo(() => {
    const values = new Set<string>();
    centers.forEach((item) => item.setor_departamento && values.add(item.setor_departamento));
    return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [centers]);

  const filtered = useMemo(() => {
    return centers.filter((item) => {
      if (search && !norm(item.nome).includes(norm(search))) return false;
      if (codeSearch && !norm(item.codigo).includes(norm(codeSearch))) return false;
      if (classificationSearch && !norm(item.classificacao).includes(norm(classificationSearch))) return false;
      if (unitFilter !== "all" && item.unidade_polo !== unitFilter) return false;
      if (sectorFilter !== "all" && item.setor_departamento !== sectorFilter) return false;
      if (statusFilter === "active" && !item.ativo) return false;
      if (statusFilter === "inactive" && item.ativo) return false;
      return true;
    });
  }, [centers, classificationSearch, codeSearch, search, sectorFilter, statusFilter, unitFilter]);

  const stats = useMemo(() => {
    const active = centers.filter((item) => item.ativo).length;
    const pending = centers.filter(
      (item) => !item.classificacao || !item.unidade_polo || !item.setor_departamento,
    ).length;
    return {
      total: centers.length,
      units: new Set(centers.map((item) => item.unidade_polo).filter(Boolean)).size,
      active,
      pending,
    };
  }, [centers]);

  const startNew = () => setEditing({ ...EMPTY_FORM, unidade_polo: unitFilter !== "all" ? unitFilter : "" });

  const startEdit = (item: CostCenter) => {
    setEditing({
      id: item.id,
      nome: item.nome,
      codigo: item.codigo,
      classificacao: item.classificacao ?? "",
      unidade_polo: item.unidade_polo ?? "",
      campus: item.campus ?? "",
      setor_departamento: item.setor_departamento ?? "",
      ativo: item.ativo,
      observacoes: item.observacoes ?? "",
    });
  };

  const saveForm = async () => {
    if (!editing) return;
    await upsert.mutateAsync(editing);
    setEditing(null);
  };

  const resetFilters = () => {
    setSearch("");
    setCodeSearch("");
    setClassificationSearch("");
    setUnitFilter("all");
    setStatusFilter("all");
    setSectorFilter("all");
  };

  const handleExport = async () => {
    const data = filtered.map((item) => ({
      "Nome do Centro de Custo": item.nome,
      "Centro de Custo": item.codigo,
      Classificação: item.classificacao ?? "",
      "Unidade / Polo Sintético": item.unidade_polo ?? "",
      "Campus / Unidade": item.campus ?? "",
      "Setor / Departamento": item.setor_departamento ?? "",
      Status: item.ativo ? "Ativo" : "Inativo",
      Observações: item.observacoes ?? "",
      "Data de criação": fmtDate(item.created_at),
      "Última atualização": fmtDate(item.updated_at),
    }));
    exportToExcel(data, `setores_centro_custo_${new Date().toISOString().slice(0, 10)}.xlsx`, "Centros de Custo");
    await logExport.mutateAsync({
      scope: filtered.length === centers.length ? "all" : "filtered",
      total: filtered.length,
      filters: { search, codeSearch, classificationSearch, unitFilter, statusFilter, sectorFilter },
    });
    toast({ title: "Exportação concluída", description: `${filtered.length} registro(s) exportado(s).` });
  };

  const downloadTemplate = () => {
    exportToExcel(TEMPLATE_ROWS, "modelo_setores_centro_custo.xlsx", "Modelo");
  };

  const downloadImportErrors = () => {
    const data = importRows.map((row) => ({
      Linha: row.rowNumber,
      Status: row.status,
      Mensagens: row.messages.join("; "),
      "Nome do Centro de Custo": row.data.nome,
      "Centro de Custo": row.data.codigo,
      Classificação: row.data.classificacao,
      "Unidade / Polo Sintético": row.data.unidade_polo,
      "Setor / Departamento": row.data.setor_departamento,
    }));
    exportToExcel(data, "relatorio_importacao_centros_custo.xlsx", "Conferência");
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const preview = buildImportPreview(rows, centers, units);
    setImportRows(preview);
    setImportOpen(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = async () => {
    const valid = importRows.filter((row) => !row.status.includes("Erro") && row.status !== "Duplicado");
    if (valid.length === 0) {
      toast({ title: "Nenhuma linha válida para importar", variant: "destructive" });
      return;
    }
    await bulkUpsert.mutateAsync(valid.map((row) => row.data));
    setImportOpen(false);
    setImportRows([]);
  };

  const importSummary = useMemo(() => {
    const errors = importRows.filter((row) => row.status.includes("Erro") || row.status === "Duplicado").length;
    const warnings = importRows.filter((row) => row.status === "Unidade não encontrada" || row.status === "Classificação inválida").length;
    return {
      total: importRows.length,
      novos: importRows.filter((row) => row.status === "Novo registro").length,
      atualizados: importRows.filter((row) => row.status === "Será atualizado").length,
      duplicados: importRows.filter((row) => row.status === "Duplicado").length,
      errors,
      warnings,
    };
  }, [importRows]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <PageHeader
          icon={Building2}
          title="Setores / Centro de Custo"
          description="Gerencie os setores, centros de custo, classificações e unidades utilizados nos cadastros e nas requisições do sistema."
          actions={(
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Baixar Modelo
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Importar Planilha
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Exportar
              </Button>
              <Button size="sm" className="bg-gradient-primary text-white" onClick={startNew}>
                <Plus className="h-4 w-4 mr-2" /> Novo Centro de Custo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>
          )}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard icon={Building2} label="Total de Centros" value={stats.total} tone="blue" />
          <SummaryCard icon={GitBranch} label="Unidades cadastradas" value={stats.units} tone="indigo" />
          <SummaryCard icon={CheckCircle2} label="Centros ativos" value={stats.active} tone="emerald" />
          <SummaryCard icon={AlertCircle} label="Pendências" value={stats.pending} tone="amber" />
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <FilterInput label="Nome do Centro de Custo" value={search} onChange={setSearch} placeholder="Buscar por nome" />
              <FilterInput label="Código" value={codeSearch} onChange={setCodeSearch} placeholder="10101" />
              <FilterInput label="Classificação" value={classificationSearch} onChange={setClassificationSearch} placeholder="01.03" />
              <div className="space-y-1.5">
                <Label className="text-xs">Unidade / Polo</Label>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {units.map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Setor / Departamento</Label>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {sectors.map((sector) => <SelectItem key={sector} value={sector}>{sector}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {filtered.length.toLocaleString("pt-BR")} de {centers.length.toLocaleString("pt-BR")} registro(s)
              </p>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Carregando centros de custo...</div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Search} title="Nenhum centro encontrado" description="Ajuste os filtros ou cadastre um novo centro de custo." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Centro de Custo</TableHead>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Unidade / Polo Sintético</TableHead>
                      <TableHead>Setor / Departamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última atualização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const linked = linkedIds.has(item.id);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.nome}</div>
                            {item.observacoes && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{item.observacoes}</div>}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                          <TableCell className="font-mono text-xs">{item.classificacao || "—"}</TableCell>
                          <TableCell>{item.unidade_polo || "—"}</TableCell>
                          <TableCell>{item.setor_departamento || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={item.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}>
                              {item.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{fmtDate(item.updated_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Visualizar" onClick={() => setViewing(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Usuários vinculados" onClick={() => setLinksFor(linksFor?.id === item.id ? null : item)}>
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Editar" onClick={() => startEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={item.ativo ? "Inativar" : "Reativar"}
                                onClick={() => setStatus.mutate({ id: item.id, ativo: !item.ativo })}
                              >
                                {item.ativo ? <XCircle className="h-4 w-4 text-amber-600" /> : <RotateCcw className="h-4 w-4 text-emerald-600" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={linked ? "Não é possível excluir: há vínculos" : "Excluir"}
                                disabled={linked}
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className={cn("h-4 w-4", linked ? "text-muted-foreground" : "text-destructive")} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {linksFor && <UserCostCenterLinks costCenter={linksFor} />}
      </div>

      <CostCenterFormModal
        value={editing}
        open={!!editing}
        units={units}
        onChange={setEditing}
        onClose={() => setEditing(null)}
        onSave={saveForm}
        saving={upsert.isPending}
      />

      <CostCenterDetailsModal value={viewing} open={!!viewing} onClose={() => setViewing(null)} />

      <ImportPreviewModal
        open={importOpen}
        rows={importRows}
        summary={importSummary}
        saving={bulkUpsert.isPending}
        onClose={() => setImportOpen(false)}
        onConfirm={confirmImport}
        onDownloadErrors={downloadImportErrors}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação só será permitida se não houver vínculos com usuários, requisições, pedidos ou histórico financeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                if (!deleteTarget) return;
                await remove.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
                refetch();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

function useLinkedCostCenterIds(organizationId?: string) {
  return useQuery({
    queryKey: ["linked_cost_center_ids", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const tables = ["user_cost_centers", "purchase_requests", "purchase_orders", "accounts_payable", "ci_requests"];
      const results = await Promise.all(
        tables.map((table) =>
          (supabase as unknown as DynamicSupabase)
            .from(table)
            .select("cost_center_id")
            .eq("organization_id", organizationId)
            .not("cost_center_id", "is", null),
        ),
      );
      const ids = new Set<string>();
      results.forEach((result) => {
        if (result.error) return;
        (result.data ?? []).forEach((row) => row.cost_center_id && ids.add(row.cost_center_id));
      });
      return ids;
    },
  });
}

function buildImportPreview(rows: Record<string, unknown>[], centers: CostCenter[], units: string[]): ImportRow[] {
  const existingByKey = new Map(centers.map((item) => [keyOf(item.unidade_polo, item.codigo), item]));
  const unitSet = new Set(units.map(norm));
  const seen = new Set<string>();

  return rows.map((row, index) => {
    const data: CostCenterInput = {
      nome: readCell(row, ["Nome do Centro de Custo", "Nome", "Centro"]),
      codigo: readCell(row, ["Centro de Custo", "Código", "Codigo", "Codigo do Centro de Custo"]),
      classificacao: readCell(row, ["Classificação", "Classificacao"]),
      unidade_polo: readCell(row, ["Unidade / Polo Sintético", "Unidade / Pólo Sintético", "Unidade", "Polo", "Pólo"]),
      campus: readCell(row, ["Campus / Unidade", "Campus"]),
      setor_departamento: readCell(row, ["Setor / Departamento", "Setor", "Departamento"]),
      ativo: norm(readCell(row, ["Status"])) !== "inativo",
      observacoes: readCell(row, ["Observações", "Observacoes", "Observação", "Observacao"]),
    };
    data.campus = data.campus || data.unidade_polo;
    data.setor_departamento = data.setor_departamento || data.nome;

    const messages: string[] = [];
    let status: ImportStatus = "Novo registro";

    if (!data.nome || !data.codigo || !data.classificacao || !data.unidade_polo) {
      status = "Erro de preenchimento";
      messages.push("Nome, Centro de Custo, Classificação e Unidade são obrigatórios.");
    }

    const key = keyOf(data.unidade_polo, data.codigo);
    if (seen.has(key)) {
      status = "Duplicado";
      messages.push("Centro de custo duplicado na própria planilha.");
    }
    seen.add(key);

    if (data.classificacao && !classificationOk(data.classificacao)) {
      status = status === "Novo registro" ? "Classificação inválida" : status;
      messages.push("Classificação fora do padrão numérico hierárquico, exemplo: 01.03.04.");
    }

    if (data.unidade_polo && unitSet.size > 0 && !unitSet.has(norm(data.unidade_polo))) {
      status = status === "Novo registro" ? "Unidade não encontrada" : status;
      messages.push("Unidade ainda não existe na base atual. Será criada como novo agrupamento se confirmada.");
    }

    const existing = existingByKey.get(key);
    if (existing && status === "Novo registro") {
      status = "Será atualizado";
      data.id = existing.id;
      messages.push("Centro de custo já existente nesta unidade; será atualizado.");
    }

    return {
      rowNumber: index + 2,
      data,
      status,
      messages,
      existingId: existing?.id,
    };
  });
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: "blue" | "indigo" | "emerald" | "amber" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg border flex items-center justify-center", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-semibold">{value.toLocaleString("pt-BR")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CostCenterFormModal({
  value,
  open,
  units,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  value: CostCenterInput | null;
  open: boolean;
  units: string[];
  saving: boolean;
  onChange: (value: CostCenterInput | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!value) return null;
  const set = (key: keyof CostCenterInput, fieldValue: CostCenterInput[keyof CostCenterInput]) => onChange({ ...value, [key]: fieldValue });
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()}>
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle>{value.id ? "Editar Centro de Custo" : "Novo Centro de Custo"}</ModalTitle>
          <ModalDescription>Preencha os dados institucionais usados nos cadastros, filtros e requisições.</ModalDescription>
        </ModalHeader>
        {value.id && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Este centro de custo pode possuir vínculos no sistema. Alterações podem impactar cadastros, filtros e relatórios.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome do Centro de Custo *">
            <Input value={value.nome} onChange={(event) => set("nome", event.target.value)} />
          </Field>
          <Field label="Código do Centro de Custo *">
            <Input value={value.codigo} onChange={(event) => set("codigo", event.target.value)} />
          </Field>
          <Field label="Classificação *">
            <Input value={value.classificacao ?? ""} onChange={(event) => set("classificacao", event.target.value)} placeholder="01.03.04" />
          </Field>
          <Field label="Unidade / Polo Sintético *">
            <Input list="cost-center-units" value={value.unidade_polo ?? ""} onChange={(event) => set("unidade_polo", event.target.value)} />
            <datalist id="cost-center-units">
              {units.map((unit) => <option key={unit} value={unit} />)}
            </datalist>
          </Field>
          <Field label="Campus / Unidade">
            <Input value={value.campus ?? ""} onChange={(event) => set("campus", event.target.value)} />
          </Field>
          <Field label="Setor / Departamento">
            <Input value={value.setor_departamento ?? ""} onChange={(event) => set("setor_departamento", event.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={value.ativo ? "ativo" : "inativo"} onValueChange={(next) => set("ativo", next === "ativo")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Observações">
              <Textarea rows={3} value={value.observacoes ?? ""} onChange={(event) => set("observacoes", event.target.value)} />
            </Field>
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function CostCenterDetailsModal({ value, open, onClose }: { value: CostCenter | null; open: boolean; onClose: () => void }) {
  if (!value) return null;
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <ModalTitle>{value.nome}</ModalTitle>
          <ModalDescription>{value.codigo} • {value.unidade_polo || "Sem unidade"}</ModalDescription>
        </ModalHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Classificação" value={value.classificacao} />
          <Info label="Campus / Unidade" value={value.campus} />
          <Info label="Setor / Departamento" value={value.setor_departamento} />
          <Info label="Status" value={value.ativo ? "Ativo" : "Inativo"} />
          <Info label="Criado em" value={fmtDate(value.created_at)} />
          <Info label="Última atualização" value={fmtDate(value.updated_at)} />
        </div>
        {value.observacoes && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="text-xs text-muted-foreground mb-1">Observações</div>
            {value.observacoes}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

function ImportPreviewModal({
  open,
  rows,
  summary,
  saving,
  onClose,
  onConfirm,
  onDownloadErrors,
}: {
  open: boolean;
  rows: ImportRow[];
  summary: { total: number; novos: number; atualizados: number; duplicados: number; errors: number; warnings: number };
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDownloadErrors: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()}>
      <ModalContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Conferência da Importação</ModalTitle>
          <ModalDescription>Nenhum dado será salvo antes da confirmação final.</ModalDescription>
        </ModalHeader>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <MiniStat label="Linhas" value={summary.total} />
          <MiniStat label="Novos" value={summary.novos} />
          <MiniStat label="Atualizações" value={summary.atualizados} />
          <MiniStat label="Duplicados" value={summary.duplicados} />
          <MiniStat label="Erros" value={summary.errors} />
          <MiniStat label="Avisos" value={summary.warnings} />
        </div>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Mensagens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rowNumber}>
                  <TableCell>{row.rowNumber}</TableCell>
                  <TableCell><ImportBadge status={row.status} /></TableCell>
                  <TableCell>{row.data.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{row.data.codigo}</TableCell>
                  <TableCell className="font-mono text-xs">{row.data.classificacao}</TableCell>
                  <TableCell>{row.data.unidade_polo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.messages.join(" ") || "Válido"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="outline" onClick={onDownloadErrors} disabled={rows.length === 0}>Baixar relatório</Button>
          <Button onClick={onConfirm} disabled={saving || summary.total === 0 || summary.errors === summary.total}>
            {saving ? "Importando..." : "Confirmar Importação"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}

function ImportBadge({ status }: { status: ImportStatus }) {
  const isError = status === "Duplicado" || status === "Erro de preenchimento";
  const isWarning = status === "Unidade não encontrada" || status === "Classificação inválida";
  return (
    <Badge
      variant="outline"
      className={cn(
        isError && "bg-red-50 text-red-700 border-red-200",
        isWarning && "bg-amber-50 text-amber-700 border-amber-200",
        status === "Novo registro" && "bg-emerald-50 text-emerald-700 border-emerald-200",
        status === "Será atualizado" && "bg-blue-50 text-blue-700 border-blue-200",
      )}
    >
      {status}
    </Badge>
  );
}
