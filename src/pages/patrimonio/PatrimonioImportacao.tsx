import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle, Copy, FileSpreadsheet, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { downloadImportTemplate, downloadErrorReport, IMPORT_COLUMNS } from "@/lib/patrimonio/importTemplate";
import { parseRows, validateRows, summarize, type ParsedRow, type ValidationContext, type RowStatus } from "@/lib/patrimonio/importValidation";
import { cn } from "@/lib/utils";
import { ImportLoadingOverlay } from "@/components/shared/ImportLoadingOverlay";


const sb = supabase as any;

type Step = 1 | 2 | 3 | 4;

const STATUS_META: Record<RowStatus, { label: string; color: string; icon: any }> = {
  ready: { label: "Pronto", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  warning: { label: "Aviso", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: AlertTriangle },
  error: { label: "Erro", color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle },
  duplicate: { label: "Duplicado", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30", icon: Copy },
  ignored: { label: "Ignorado", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

export default function PatrimonioImportacao() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filter, setFilter] = useState<RowStatus | "all">("all");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [imported, setImported] = useState<number>(0);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const RENDER_CAP = 500;

  // Reference data for template + validation
  const { data: refs } = useQuery({
    queryKey: ["import-refs"],
    queryFn: async () => {
      const [cats, types, units, buildings, sectors, assets] = await Promise.all([
        sb.from("asset_categories").select("id,name").eq("is_active", true),
        sb.from("asset_types").select("id,name,category_id").eq("is_active", true),
        sb.from("units").select("id,name").eq("is_active", true),
        sb.from("unit_blocks").select("id,name,unit_id"),
        sb.from("unit_sectors").select("id,name"),
        sb.from("assets").select("asset_number,internal_code,serial_number").is("deleted_at", null),
      ]);
      return {
        categories: cats.data ?? [], types: types.data ?? [],
        units: units.data ?? [], buildings: buildings.data ?? [],
        sectors: sectors.data ?? [], existingAssets: assets.data ?? [],
      } as ValidationContext;
    },
  });

  const summary = useMemo(() => summarize(rows), [rows]);
  const filtered = useMemo(
    () => filter === "all" ? rows : rows.filter((r) => r.status === filter),
    [rows, filter]
  );
  const importable = useMemo(
    () => rows.filter((r) => r.status === "ready" || r.status === "warning"),
    [rows]
  );

  const handleTemplate = () => {
    if (!refs) return;
    const typesByCategory: Record<string, string[]> = {};
    for (const c of refs.categories as any[]) {
      typesByCategory[c.name] = (refs.types as any[])
        .filter((t) => t.category_id === c.id)
        .map((t) => t.name)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
    downloadImportTemplate({
      categories: (refs.categories as any[]).map((c) => c.name),
      units: (refs.units as any[]).map((u) => u.name),
      buildings: (refs.buildings as any[]).map((b) => b.name),
      sectors: (refs.sectors as any[]).map((s) => s.name),
      typesByCategory,
    });

  };

  const handleFile = async (file: File) => {
    if (!refs) { toast({ title: "Aguarde", description: "Carregando cadastros de referência..." }); return; }
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, defval: "" });
    const parsed = parseRows(aoa);
    if (!parsed.length) {
      toast({ title: "Planilha vazia", description: "Nenhuma linha de dados encontrada.", variant: "destructive" });
      return;
    }
    const validated = validateRows(parsed, refs);
    setRows(validated);
    setStep(2);
  };

  const toggleIgnore = (rowIndex: number) => {
    setRows((rs) => rs.map((r) => r.rowIndex === rowIndex
      ? { ...r, status: r.status === "ignored" ? (r.errors.length ? "error" : r.warnings.length ? "warning" : "ready") : "ignored" }
      : r));
  };

  const handleExportErrors = () => {
    const bad = rows.filter((r) => r.status === "error" || r.status === "duplicate");
    if (!bad.length) { toast({ title: "Nenhum erro para exportar" }); return; }
    downloadErrorReport(bad.map((r) => ({
      Linha: r.rowIndex,
      "Nº Patrimônio": r.data.asset_number ?? "",
      Descrição: r.data.name ?? "",
      Status: STATUS_META[r.status].label,
      Erros: r.errors.join(" | "),
      Avisos: r.warnings.join(" | "),
    })));
  };

  const commitImport = async () => {
    setCommitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;

      // Create batch record
      const { data: batch, error: batchErr } = await sb.from("asset_import_batches").insert({
        file_name: fileName || "importacao.xlsx",
        imported_by: uid,
        total_rows: rows.length,
        imported_rows: 0,
        error_rows: rows.filter((r) => r.status === "error" || r.status === "duplicate").length,
        status: "processando",
      }).select().single();
      if (batchErr) throw batchErr;

      const payloads = importable.map((r) => ({
        asset_number: r.data.asset_number!,
        internal_code: r.data.internal_code || null,
        name: r.data.name!,
        category_id: r.resolved.category_id ?? null,
        type_id: r.resolved.type_id ?? null,
        unit_id: r.resolved.unit_id ?? null,
        building_id: r.resolved.building_id ?? null,
        sector_id: r.resolved.sector_id ?? null,
        specific_location: r.data.specific_location || null,
        brand: r.data.brand || null,
        model: r.data.model || null,
        serial_number: r.data.serial_number || null,
        color: r.data.color || null,
        material: r.data.material || null,
        status: (r.data.status as any) || "ativo",
        physical_condition: (r.data.physical_condition as any) || "bom",
        invoice_number: r.data.invoice_number || null,
        acquisition_date: r.data.acquisition_date || null,
        acquisition_value: r.data.acquisition_value ?? null,
        warranty_until: r.data.warranty_until || null,
        notes: [r.data.notes, `Importado via lote ${batch.id.slice(0, 8)}`].filter(Boolean).join(" — "),
        created_by: uid, updated_by: uid,
      }));

      let ok = 0;
      const errs: any[] = [];
      const CHUNK = 500;
      setProgress({ done: 0, total: payloads.length });
      // insert in chunks
      for (let i = 0; i < payloads.length; i += CHUNK) {
        const chunk = payloads.slice(i, i + CHUNK);
        const { data, error } = await sb.from("assets").insert(chunk).select("id");
        if (error) errs.push({ chunk: i, message: error.message });
        else ok += (data?.length ?? 0);
        setProgress({ done: Math.min(i + CHUNK, payloads.length), total: payloads.length });
      }

      await sb.from("asset_import_batches").update({
        imported_rows: ok,
        status: errs.length ? "concluido_com_erros" : "concluido",
        errors_log: errs.length ? errs : null,
      }).eq("id", batch.id);

      setBatchId(batch.id);
      setImported(ok);
      setStep(4);
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast({ title: `${ok} patrimônios importados` });
    } catch (e: any) {
      toast({ title: "Erro na importação", description: e.message, variant: "destructive" });
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStep(1); setRows([]); setFileName(""); setConfirmChecked(false); setBatchId(null); setImported(0);
  };

  return (
    <MainLayout>
      <ImportLoadingOverlay
        open={committing}
        processed={progress.done}
        total={progress.total}
        title="Importando patrimônios..."
      />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 animate-fade-in">
        <PageHeader icon={Upload} title="Importação de Patrimônio"
          description="Importe a base de patrimônios em lote, com conferência prévia antes de gravar no sistema." />

        <StepIndicator step={step} />


        {step === 1 && (
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-semibold text-lg">1. Baixar modelo e enviar planilha</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Use o modelo oficial. Ele traz as colunas na ordem correta e a aba <strong>Listas válidas</strong> com categorias, unidades, blocos e setores já cadastrados.
                </p>
              </div>
              <Button onClick={handleTemplate} variant="outline">
                <Download className="h-4 w-4 mr-2" /> Baixar modelo (.xlsx)
              </Button>
            </div>

            <label className="border-2 border-dashed rounded-lg p-10 text-center block cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Clique para selecionar a planilha .xlsx</p>
              <p className="text-xs text-muted-foreground mt-1">Nada é gravado no banco nesta etapa — apenas leitura e validação.</p>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>

            <div className="text-xs bg-muted/40 p-3 rounded space-y-1">
              <p className="font-semibold">O que a conferência valida:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Campos obrigatórios: Nº Patrimônio, Descrição, Categoria e Unidade.</li>
                <li>Duplicidade por Nº Patrimônio, Nº de Série ou Código Interno.</li>
                <li>Vínculos oficiais: Categoria/Unidade/Bloco/Setor precisam existir no cadastro.</li>
                <li>Enums de Status e Estado Físico e parse tolerante de datas e valores.</li>
              </ul>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-lg">2. Conferência</h2>
                <p className="text-sm text-muted-foreground">Arquivo: <strong>{fileName}</strong> · {rows.length} linhas</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={reset}><ArrowLeft className="h-4 w-4 mr-1" /> Trocar arquivo</Button>
                <Button variant="outline" onClick={handleExportErrors}>
                  <Download className="h-4 w-4 mr-2" /> Baixar erros
                </Button>
                <Button onClick={() => setStep(3)} disabled={!importable.length}>
                  Continuar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <SummaryTile label="Prontos" count={summary.ready} tone="ready" />
              <SummaryTile label="Avisos" count={summary.warning} tone="warning" />
              <SummaryTile label="Erros" count={summary.error} tone="error" />
              <SummaryTile label="Duplicados" count={summary.duplicate} tone="duplicate" />
              <SummaryTile label="Ignorados" count={summary.ignored} tone="ignored" />
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all">Todas ({rows.length})</TabsTrigger>
                <TabsTrigger value="ready">Prontos ({summary.ready})</TabsTrigger>
                <TabsTrigger value="warning">Avisos ({summary.warning})</TabsTrigger>
                <TabsTrigger value="error">Erros ({summary.error})</TabsTrigger>
                <TabsTrigger value="duplicate">Duplicados ({summary.duplicate})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="border rounded-lg overflow-x-auto max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead>Nº Patrim.</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Mensagens</TableHead>
                    <TableHead className="w-24">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, RENDER_CAP).map((r) => {
                    const meta = STATUS_META[r.status];
                    const Icon = meta.icon;
                    return (
                      <TableRow key={r.rowIndex} className={cn(r.status === "ignored" && "opacity-50")}>
                        <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", meta.color)}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{r.data.asset_number || "—"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{r.data.name || "—"}</TableCell>
                        <TableCell>{r.data.category || "—"}</TableCell>
                        <TableCell>{r.data.unit || "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.errors.map((e, i) => <div key={`e${i}`} className="text-destructive">• {e}</div>)}
                          {r.warnings.map((w, i) => <div key={`w${i}`} className="text-amber-600 dark:text-amber-400">• {w}</div>)}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => toggleIgnore(r.rowIndex)}>
                            {r.status === "ignored" ? "Restaurar" : "Ignorar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length > RENDER_CAP && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-3 text-xs text-muted-foreground bg-muted/30">
                        Mostrando as primeiras {RENDER_CAP.toLocaleString("pt-BR")} de {filtered.length.toLocaleString("pt-BR")} linhas — use os filtros de status ou <strong>Baixar erros</strong> para ver o restante. Todas as linhas serão importadas normalmente.
                      </TableCell>
                    </TableRow>
                  )}
                  {!filtered.length && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma linha neste filtro.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 space-y-4 max-w-2xl">
            <h2 className="font-semibold text-lg">3. Confirmar importação</h2>
            <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
              <p className="text-sm"><strong>{importable.length}</strong> patrimônios serão importados.</p>
              <p className="text-sm text-muted-foreground">
                <strong>{rows.length - importable.length}</strong> linhas serão ignoradas (erros, duplicados ou marcadas manualmente).
              </p>
              <p className="text-xs text-muted-foreground">Cada patrimônio receberá um QR Code único gerado automaticamente. Etiquetas ficarão pendentes de impressão.</p>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={confirmChecked} onCheckedChange={(v) => setConfirmChecked(!!v)} />
              <span>Confirmo que revisei a conferência e autorizo a gravação destes patrimônios no sistema.</span>
            </label>
            {committing && progress.total > 0 && (
              <div className="rounded border p-3 bg-primary/5 text-sm space-y-1">
                <div className="flex justify-between"><span>Gravando patrimônios…</span><span className="font-mono">{progress.done.toLocaleString("pt-BR")} / {progress.total.toLocaleString("pt-BR")}</span></div>
                <div className="h-2 bg-muted rounded overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={committing}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button onClick={commitImport} disabled={!confirmChecked || committing || !importable.length}>
                {committing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</> : <>Importar {importable.length} patrimônios</>}
              </Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-8 text-center space-y-4 max-w-xl mx-auto">
            <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500" />
            <h2 className="text-xl font-semibold">Importação concluída</h2>
            <p className="text-muted-foreground">
              <strong>{imported}</strong> patrimônios foram gravados no sistema.
              {batchId && <span className="block text-xs mt-1 font-mono">Lote {batchId.slice(0, 8)}</span>}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={reset}>Nova importação</Button>
              <Button onClick={() => window.location.assign("/patrimonio")}>Ver patrimônios</Button>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = ["Upload", "Conferência", "Confirmação", "Concluído"];
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <div className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border",
              done && "bg-primary text-primary-foreground border-primary",
              active && "bg-primary/10 text-primary border-primary",
              !done && !active && "bg-muted text-muted-foreground border-border",
            )}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : n}
            </div>
            <span className={cn("text-sm", active ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function SummaryTile({ label, count, tone }: { label: string; count: number; tone: RowStatus }) {
  const meta = STATUS_META[tone];
  const Icon = meta.icon;
  return (
    <div className={cn("rounded-lg border p-3 flex items-center gap-3", meta.color)}>
      <Icon className="h-5 w-5" />
      <div>
        <div className="text-lg font-semibold leading-none">{count}</div>
        <div className="text-xs">{label}</div>
      </div>
    </div>
  );
}
