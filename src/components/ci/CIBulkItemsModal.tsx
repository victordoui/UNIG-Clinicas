import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Download, Upload, FileText, FileSpreadsheet, AlertCircle, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';
import { parseBulkText, BULK_TEMPLATE_TXT, type ParsedBulkItem } from '@/lib/ciBulkParser';
import {
  BULK_ALLOWED_UNITS, BULK_LIMITS,
  findSuggestionMatch, normalizeDescription, getSuggestionsForDestination,
} from '@/lib/ciItemSuggestions';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export interface BulkItem {
  descricao: string;
  quantidade: number;
  unidade: string;
  especificacao?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (items: BulkItem[]) => void;
  defaultUnit?: string;
  destinationSector?: string | null;
  existingItems?: BulkItem[];
}

interface RowState extends BulkItem {
  _mergedFromCount?: number; // quantas linhas se fundiram nesta
  _matchedSuggestion?: string; // descrição padronizada sugerida
  _existsInForm?: boolean;
}

interface RowErrors {
  descricao?: string;
  quantidade?: string;
  unidade?: string;
}

function validateRow(r: RowState): RowErrors {
  const e: RowErrors = {};
  const desc = (r.descricao ?? '').trim();
  if (desc.length < BULK_LIMITS.MIN_DESC_CHARS) e.descricao = `Mín. ${BULK_LIMITS.MIN_DESC_CHARS} caracteres`;
  else if (desc.length > BULK_LIMITS.MAX_DESC_CHARS) e.descricao = `Máx. ${BULK_LIMITS.MAX_DESC_CHARS} caracteres`;
  const q = Number(r.quantidade);
  if (!Number.isFinite(q) || !Number.isInteger(q) || q <= 0) e.quantidade = 'Quantidade inválida';
  else if (q > BULK_LIMITS.MAX_QTY) e.quantidade = `Máx. ${BULK_LIMITS.MAX_QTY}`;
  const un = (r.unidade ?? '').trim();
  if (!un) e.unidade = 'Obrigatória';
  else if (un.length > BULK_LIMITS.MAX_CUSTOM_UNIT_CHARS) e.unidade = `Máx. ${BULK_LIMITS.MAX_CUSTOM_UNIT_CHARS} chars`;
  return e;
}

function normalizeUnit(u: string, fallback: string): string {
  const up = (u || '').trim().toUpperCase();
  if (!up) return fallback;
  // aceita unidade conhecida ou texto livre curto
  const known = BULK_ALLOWED_UNITS.find(a => a === up);
  return known ?? up;
}

function dedupeAndMerge(items: RowState[]): { rows: RowState[]; mergedCount: number } {
  const map = new Map<string, RowState>();
  let merged = 0;
  for (const it of items) {
    const key = `${normalizeDescription(it.descricao)}|${(it.unidade || '').toUpperCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantidade += it.quantidade;
      existing._mergedFromCount = (existing._mergedFromCount ?? 1) + 1;
      // preserva detalhes/sugestão se já houver
      if (!existing.especificacao && it.especificacao) existing.especificacao = it.especificacao;
      merged += 1;
    } else {
      map.set(key, { ...it });
    }
  }
  return { rows: Array.from(map.values()), mergedCount: merged };
}

export function CIBulkItemsModal({
  open, onOpenChange, onConfirm,
  defaultUnit = 'UN',
  destinationSector,
  existingItems = [],
}: Props) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<RowState[]>([]);
  const [onlySuggested, setOnlySuggested] = useState(false);
  const [truncatedInfo, setTruncatedInfo] = useState<number>(0);

  const suggestions = useMemo(() => getSuggestionsForDestination(destinationSector), [destinationSector]);
  const parsed: ParsedBulkItem[] = useMemo(() => parseBulkText(text), [text]);

  useEffect(() => {
    if (!open) {
      setText(''); setRows([]); setOnlySuggested(false); setTruncatedInfo(0);
    }
  }, [open]);

  const annotateRow = (r: BulkItem): RowState => {
    const match = findSuggestionMatch(r.descricao, destinationSector);
    const normDesc = normalizeDescription(r.descricao);
    const exists = existingItems.some(e => normalizeDescription(e.descricao) === normDesc && (e.unidade || '').toUpperCase() === (r.unidade || '').toUpperCase());
    return {
      ...r,
      unidade: normalizeUnit(r.unidade, defaultUnit),
      _matchedSuggestion: match?.descricao,
      _existsInForm: exists,
    };
  };

  const applyRows = (input: BulkItem[]) => {
    let work = input;
    let truncated = 0;
    if (work.length > BULK_LIMITS.MAX_ITEMS) {
      truncated = work.length - BULK_LIMITS.MAX_ITEMS;
      work = work.slice(0, BULK_LIMITS.MAX_ITEMS);
    }
    const annotated = work.map(annotateRow);
    const { rows: deduped, mergedCount } = dedupeAndMerge(annotated);
    setRows(deduped);
    setTruncatedInfo(truncated);
    if (truncated > 0) toast.warning(`Limite de ${BULK_LIMITS.MAX_ITEMS} itens. ${truncated} linha(s) descartada(s).`);
    if (mergedCount > 0) toast.info(`${mergedCount} item(ns) duplicado(s) foram mesclados.`);
  };

  const applyParseToRows = () => {
    const next: BulkItem[] = parsed
      .filter(p => p.descricao)
      .map(p => ({ descricao: p.descricao, quantidade: p.quantidade || 1, unidade: defaultUnit }));
    applyRows(next);
  };

  const handleTextChange = (v: string) => {
    if (v.length > BULK_LIMITS.MAX_TEXT_CHARS) {
      toast.warning(`Texto truncado para ${BULK_LIMITS.MAX_TEXT_CHARS} caracteres.`);
      setText(v.slice(0, BULK_LIMITS.MAX_TEXT_CHARS));
    } else {
      setText(v);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'txt') {
        const txt = await file.text();
        const clipped = txt.slice(0, BULK_LIMITS.MAX_TEXT_CHARS);
        setText(clipped);
        const next: BulkItem[] = parseBulkText(clipped)
          .filter(p => p.descricao)
          .map(p => ({ descricao: p.descricao, quantidade: p.quantidade || 1, unidade: defaultUnit }));
        applyRows(next);
      } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
        const next: BulkItem[] = json
          .map(r => {
            const q = Number(r['Quantidade'] ?? r['quantidade'] ?? r['QTD'] ?? r['qtd'] ?? 1) || 1;
            const desc = String(r['Descrição'] ?? r['Descricao'] ?? r['descricao'] ?? r['Produto'] ?? '').trim();
            const det = String(r['Detalhes'] ?? r['detalhes'] ?? r['Observação'] ?? '').trim();
            const un = String(r['Unidade'] ?? r['unidade'] ?? defaultUnit).trim() || defaultUnit;
            if (!desc) return null;
            return { descricao: desc, quantidade: q, unidade: un, especificacao: det || undefined };
          })
          .filter(Boolean) as BulkItem[];
        applyRows(next);
      } else {
        toast.error('Formato não suportado. Use .txt, .xlsx ou .csv');
      }
    } catch (e: any) {
      toast.error('Falha ao ler arquivo: ' + (e?.message ?? 'erro desconhecido'));
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([BULK_TEMPLATE_TXT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo-itens-ci.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadXlsx = () => {
    const data = [
      ['Quantidade', 'Unidade', 'Descrição', 'Detalhes'],
      [30, 'UN', 'Fita durex transparente 45x40', ''],
      [48, 'UN', 'Marca texto amarelo', ''],
      [36, 'UN', 'Caneta de quadro azul (Pilot - V Board Master)', 'Cor azul'],
      [5, 'UN', 'Furador de papel', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Itens');
    XLSX.writeFile(wb, 'modelo-itens-ci.xlsx');
  };

  const updateRow = (i: number, patch: Partial<RowState>) =>
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, ...patch };
      const normDesc = normalizeDescription(next.descricao);
      next._existsInForm = existingItems.some(e => normalizeDescription(e.descricao) === normDesc && (e.unidade || '').toUpperCase() === (next.unidade || '').toUpperCase());
      next._matchedSuggestion = findSuggestionMatch(next.descricao, destinationSector)?.descricao;
      return next;
    }));
  const removeRow = (i: number) => setRows(rs => rs.filter((_, idx) => idx !== i));
  const applySuggestion = (i: number) => {
    const r = rows[i];
    if (r?._matchedSuggestion) updateRow(i, { descricao: r._matchedSuggestion });
  };

  const errorsByRow = useMemo(() => rows.map(validateRow), [rows]);
  const validRows = rows.filter((_, i) => Object.keys(errorsByRow[i]).length === 0 && rows[i].descricao.trim());
  const errorCount = errorsByRow.filter(e => Object.keys(e).length > 0).length;
  const existsCount = rows.filter(r => r._existsInForm).length;
  const mergedTotal = rows.reduce((acc, r) => acc + ((r._mergedFromCount ?? 1) - 1), 0);
  const unrecognizedLines = parsed.filter(p => !p.ok).length;

  const visibleRowIndexes = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !onlySuggested || !!r._matchedSuggestion)
    .map(({ i }) => i);

  const submit = (mode: 'add' | 'merge' | 'skipExisting') => {
    if (validRows.length === 0) { toast.error('Nenhum item válido para adicionar'); return; }
    let toSend: RowState[] = rows.filter((_, i) => Object.keys(errorsByRow[i]).length === 0);
    if (mode === 'skipExisting') toSend = toSend.filter(r => !r._existsInForm);
    // mode 'merge' e 'add' enviam tudo; pai decide mesclagem (atualmente apenas append)
    const payload: BulkItem[] = toSend.map(r => ({
      descricao: r.descricao.trim(),
      quantidade: r.quantidade,
      unidade: r.unidade,
      especificacao: r.especificacao?.trim() || undefined,
    }));
    onConfirm(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Importar itens em lote</DialogTitle>
          <DialogDescription>
            Cole sua lista no formato "QUANTIDADE - DESCRIÇÃO" ou envie um arquivo. Unidade padrão: <strong>{defaultUnit}</strong>.
            {destinationSector && (
              <> Sugestões ativadas para destino <strong>{destinationSector}</strong>.</>
            )}
            <br />
            Limite por importação: <strong>{BULK_LIMITS.MAX_ITEMS}</strong> itens.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="paste"><FileText className="h-4 w-4 mr-1" />Colar lista</TabsTrigger>
            <TabsTrigger value="file"><FileSpreadsheet className="h-4 w-4 mr-1" />Arquivo</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-3 pt-3">
            <Label className="text-sm">Cole aqui (uma linha por item)</Label>
            <Textarea
              rows={8}
              placeholder={'30 - Fita durex transparente 45x40\n48 - Marca texto amarelo\n36 - Caneta de quadro azul (Pilot - V Board Master)'}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              className="font-mono text-sm"
              maxLength={BULK_LIMITS.MAX_TEXT_CHARS}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                {parsed.length > 0 && (
                  <>
                    <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />{parsed.length - unrecognizedLines} reconhecidos</Badge>
                    {unrecognizedLines > 0 && <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{unrecognizedLines} sem padrão</Badge>}
                    <span className="text-slate-400">{text.length}/{BULK_LIMITS.MAX_TEXT_CHARS}</span>
                  </>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={applyParseToRows} disabled={!parsed.length}>
                Pré-visualizar itens
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-3 pt-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadTxt}>
                <Download className="h-4 w-4 mr-1" />Modelo TXT
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadXlsx}>
                <Download className="h-4 w-4 mr-1" />Modelo XLSX
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Selecionar arquivo (.txt, .xlsx, .csv)</Label>
              <Input
                type="file"
                accept=".txt,.xlsx,.xls,.csv"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <p className="text-[11px] text-slate-400">
                XLSX deve ter colunas: <strong>Quantidade</strong>, <strong>Unidade</strong>, <strong>Descrição</strong>, <strong>Detalhes</strong> (opcional). Máximo {BULK_LIMITS.MAX_ITEMS} linhas.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {suggestions.length > 0 && rows.length > 0 && (
          <div className="flex items-center gap-2 text-sm border-t pt-3">
            <Switch checked={onlySuggested} onCheckedChange={setOnlySuggested} id="only-suggested" />
            <Label htmlFor="only-suggested" className="cursor-pointer text-xs">
              Mostrar apenas itens reconhecidos para <strong>{destinationSector}</strong>
            </Label>
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-semibold">Pré-visualização ({validRows.length} válidos)</h4>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                {mergedTotal > 0 && <Badge variant="secondary">{mergedTotal} duplicado(s) mesclado(s)</Badge>}
                {existsCount > 0 && <Badge variant="outline" className="border-amber-300 text-amber-700"><AlertTriangle className="h-3 w-3 mr-1" />{existsCount} já está(ão) na CI</Badge>}
                {errorCount > 0 && <Badge variant="destructive">{errorCount} com erro</Badge>}
                {truncatedInfo > 0 && <Badge variant="destructive">{truncatedInfo} descartada(s) pelo limite</Badge>}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
              {visibleRowIndexes.map((i) => {
                const r = rows[i];
                const err = errorsByRow[i];
                return (
                  <div key={i} className={`grid grid-cols-12 gap-2 p-2 items-center text-sm ${Object.keys(err).length ? 'bg-destructive/5' : r._existsInForm ? 'bg-amber-50' : ''}`}>
                    <div className="col-span-2">
                      <Input type="number" min={1} value={r.quantidade}
                        onChange={e => updateRow(i, { quantidade: Number(e.target.value) || 1 })}
                        className={`h-8 ${err.quantidade ? 'border-destructive' : ''}`} />
                      {err.quantidade && <p className="text-[10px] text-destructive mt-0.5">{err.quantidade}</p>}
                    </div>
                    <div className="col-span-2">
                      <Input value={r.unidade} onChange={e => updateRow(i, { unidade: e.target.value.toUpperCase() })}
                        className={`h-8 ${err.unidade ? 'border-destructive' : ''}`} maxLength={BULK_LIMITS.MAX_CUSTOM_UNIT_CHARS} />
                      {err.unidade && <p className="text-[10px] text-destructive mt-0.5">{err.unidade}</p>}
                    </div>
                    <div className="col-span-7">
                      <Input value={r.descricao} onChange={e => updateRow(i, { descricao: e.target.value })}
                        className={`h-8 ${err.descricao ? 'border-destructive' : ''}`} maxLength={BULK_LIMITS.MAX_DESC_CHARS} />
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {err.descricao && <span className="text-[10px] text-destructive">{err.descricao}</span>}
                        {r._mergedFromCount && r._mergedFromCount > 1 && (
                          <Badge variant="secondary" className="text-[10px] h-4">agrupado ×{r._mergedFromCount}</Badge>
                        )}
                        {r._existsInForm && (
                          <Badge variant="outline" className="text-[10px] h-4 border-amber-400 text-amber-700">já na CI</Badge>
                        )}
                        {r._matchedSuggestion && r._matchedSuggestion !== r.descricao && (
                          <button type="button" onClick={() => applySuggestion(i)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />usar “{r._matchedSuggestion}”
                          </button>
                        )}
                        {r._matchedSuggestion && r._matchedSuggestion === r.descricao && (
                          <Badge className="bg-green-600 text-[10px] h-4"><CheckCircle2 className="h-3 w-3 mr-0.5" />reconhecido</Badge>
                        )}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => removeRow(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {suggestions.length > 0 && (
              <datalist id="ci-bulk-suggestions">
                {suggestions.map(s => <option key={s.descricao} value={s.descricao} />)}
              </datalist>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {existsCount > 0 && (
            <Button variant="outline" onClick={() => submit('skipExisting')} disabled={validRows.length === 0}>
              Ignorar duplicados e adicionar
            </Button>
          )}
          <Button onClick={() => submit('add')} disabled={validRows.length === 0 || errorCount > 0}>
            <Upload className="h-4 w-4 mr-1" />
            Adicionar {validRows.length} {validRows.length === 1 ? 'item' : 'itens'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
