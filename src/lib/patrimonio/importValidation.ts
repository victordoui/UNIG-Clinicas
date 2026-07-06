import { IMPORT_COLUMNS, VALID_CONDITION, VALID_STATUS } from "./importTemplate";

export type RowStatus = "ready" | "warning" | "error" | "duplicate" | "ignored";

export interface ParsedRow {
  rowIndex: number; // 1-based (excel row)
  raw: Record<string, any>;
  data: {
    asset_number?: string;
    internal_code?: string;
    name?: string;
    category?: string;
    type?: string;
    unit?: string;
    building?: string;
    sector?: string;
    subspace?: string;
    specific_location?: string;
    responsible_email?: string;
    physical_condition?: string;
    status?: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    color?: string;
    material?: string;
    invoice_number?: string;
    acquisition_date?: string | null;
    acquisition_value?: number | null;
    warranty_until?: string | null;
    notes?: string;
  };
  status: RowStatus;
  errors: string[];
  warnings: string[];
  resolved: {
    category_id?: string | null;
    type_id?: string | null;
    unit_id?: string | null;
    building_id?: string | null;
    sector_id?: string | null;
  };
}

const HEADER_ALIASES: Record<string, string> = {};
IMPORT_COLUMNS.forEach((c) => {
  HEADER_ALIASES[c.label.toLowerCase()] = c.key;
  HEADER_ALIASES[c.label.replace("*", "").trim().toLowerCase()] = c.key;
  HEADER_ALIASES[c.key.toLowerCase()] = c.key;
});

export function normalizeHeaders(headers: string[]): (string | null)[] {
  return headers.map((h) => HEADER_ALIASES[String(h ?? "").trim().toLowerCase()] ?? null);
}

function parseDateBR(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return s.slice(0, 10);
  return null;
}

function parseMoney(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s.]/g, "").replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : null;
}

export interface ValidationContext {
  categories: { id: string; name: string }[];
  types: { id: string; name: string; category_id: string }[];
  units: { id: string; name: string }[];
  buildings: { id: string; name: string; unit_id: string }[];
  sectors: { id: string; name: string }[];
  existingAssets: { asset_number: string; internal_code: string | null; serial_number: string | null }[];
}

const norm = (s: string) => s.trim().toLowerCase();

/** Aliases: nome que vem na planilha → nome oficial cadastrado (case-insensitive) */
const TYPE_ALIASES: Record<string, string> = {
  "câmera": "câmera de segurança",
  "camera": "câmera de segurança",
};
const CATEGORY_WITHOUT_TYPE_REQUIRED = new Set(["outros"]);

export function parseRows(aoa: any[][]): ParsedRow[] {
  if (aoa.length < 2) return [];
  const headers = aoa[0].map((h) => String(h ?? ""));
  const keys = normalizeHeaders(headers);
  const out: ParsedRow[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.every((c) => c == null || c === "")) continue;
    const raw: Record<string, any> = {};
    const data: any = {};
    headers.forEach((h, idx) => {
      raw[h] = row[idx];
      const k = keys[idx];
      if (k) data[k] = row[idx];
    });
    // Normalize primitives
    ["asset_number","internal_code","name","category","type","unit","building","sector",
     "subspace","specific_location","responsible_email","brand","model","serial_number",
     "color","material","invoice_number","notes"].forEach((k) => {
      if (data[k] != null) data[k] = String(data[k]).trim();
    });
    if (data.status) data.status = String(data.status).trim().toLowerCase();
    if (data.physical_condition) data.physical_condition = String(data.physical_condition).trim().toLowerCase();
    data.acquisition_date = parseDateBR(data.acquisition_date);
    data.warranty_until = parseDateBR(data.warranty_until);
    data.acquisition_value = parseMoney(data.acquisition_value);
    out.push({
      rowIndex: i + 1, raw, data,
      status: "ready", errors: [], warnings: [], resolved: {},
    });
  }
  return out;
}

export function validateRows(rows: ParsedRow[], ctx: ValidationContext): ParsedRow[] {
  const catByName = new Map(ctx.categories.map((c) => [norm(c.name), c]));
  const typeByName = new Map(ctx.types.map((t) => [norm(t.name), t]));
  const unitByName = new Map(ctx.units.map((u) => [norm(u.name), u]));
  const buildByName = new Map(ctx.buildings.map((b) => [`${b.unit_id}::${norm(b.name)}`, b]));
  const sectorByName = new Map(ctx.sectors.map((s) => [norm(s.name), s]));
  const existingNumbers = new Set(ctx.existingAssets.map((a) => norm(a.asset_number)));
  const existingSerials = new Set(ctx.existingAssets.filter((a) => a.serial_number).map((a) => norm(a.serial_number!)));
  const existingInternal = new Set(ctx.existingAssets.filter((a) => a.internal_code).map((a) => norm(a.internal_code!)));

  const seenNumbers = new Set<string>();
  const seenSerials = new Set<string>();

  // Detecta importação histórica em massa: se o campo estiver vazio em ≥95% das linhas,
  // não polui a conferência com aviso repetido em cada linha.
  const total = Math.max(rows.length, 1);
  const missCount = { serial: 0, invoice: 0, resp: 0 };
  for (const r of rows) {
    if (!r.data.serial_number) missCount.serial++;
    if (!r.data.invoice_number) missCount.invoice++;
    if (!r.data.responsible_email) missCount.resp++;
  }
  const bulk = {
    serial: missCount.serial / total >= 0.95,
    invoice: missCount.invoice / total >= 0.95,
    resp: missCount.resp / total >= 0.95,
  };

  return rows.map((r) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const resolved: ParsedRow["resolved"] = {};
    const d = r.data;

    // required
    if (!d.asset_number) errors.push("Nº Patrimônio é obrigatório");
    if (!d.name) errors.push("Descrição é obrigatória");
    if (!d.category) errors.push("Categoria é obrigatória");
    if (!d.unit) errors.push("Unidade é obrigatória");

    // enums
    if (d.status && !VALID_STATUS.includes(d.status)) errors.push(`Status inválido: "${d.status}"`);
    if (d.physical_condition && !VALID_CONDITION.includes(d.physical_condition))
      errors.push(`Estado físico inválido: "${d.physical_condition}"`);

    // resolve refs
    let catNorm: string | null = null;
    if (d.category) {
      catNorm = norm(d.category);
      const c = catByName.get(catNorm);
      if (!c) errors.push(`Categoria "${d.category}" não cadastrada`);
      else resolved.category_id = c.id;
    }
    if (d.type && resolved.category_id) {
      const rawKey = norm(d.type);
      const key = TYPE_ALIASES[rawKey] ?? rawKey;
      const t = typeByName.get(key);
      if (!t) warnings.push(`Tipo "${d.type}" não cadastrado (será ignorado)`);
      else if (t.category_id !== resolved.category_id) warnings.push(`Tipo "${d.type}" não pertence à categoria`);
      else resolved.type_id = t.id;
    }
    if (d.unit) {
      const u = unitByName.get(norm(d.unit));
      if (!u) errors.push(`Unidade "${d.unit}" não cadastrada`);
      else resolved.unit_id = u.id;
    }
    if (d.building && resolved.unit_id) {
      const b = buildByName.get(`${resolved.unit_id}::${norm(d.building)}`);
      if (!b) warnings.push(`Bloco "${d.building}" não encontrado nesta unidade`);
      else resolved.building_id = b.id;
    }
    if (d.sector) {
      const s = sectorByName.get(norm(d.sector));
      if (!s) warnings.push(`Setor "${d.sector}" não cadastrado`);
      else resolved.sector_id = s.id;
    }

    // duplicates
    let isDup = false;
    if (d.asset_number) {
      const key = norm(d.asset_number);
      if (existingNumbers.has(key)) { errors.push(`Nº Patrimônio já existe no sistema`); isDup = true; }
      if (seenNumbers.has(key)) { errors.push(`Nº Patrimônio duplicado na planilha`); isDup = true; }
      seenNumbers.add(key);
    }
    if (d.internal_code) {
      const key = norm(d.internal_code);
      if (existingInternal.has(key)) { errors.push(`Código Interno já existe`); isDup = true; }
    }
    if (d.serial_number) {
      const key = norm(d.serial_number);
      if (existingSerials.has(key)) { errors.push(`Nº de Série já existe`); isDup = true; }
      if (seenSerials.has(key)) { errors.push(`Nº de Série duplicado na planilha`); isDup = true; }
      seenSerials.add(key);
    }

    // warnings soft (suprimidos em importação histórica ou quando categoria dispensa tipo)
    if (!d.serial_number && !bulk.serial) warnings.push("Sem Nº de Série");
    if (!d.invoice_number && !bulk.invoice) warnings.push("Sem Nota Fiscal");
    if (!d.responsible_email && !bulk.resp) warnings.push("Sem responsável");
    if (!d.type && catNorm && !CATEGORY_WITHOUT_TYPE_REQUIRED.has(catNorm)) {
      // aviso silencioso apenas para categorias que costumam ter tipo; "Outros" nunca avisa
    }

    let status: RowStatus = "ready";
    if (errors.length && isDup) status = "duplicate";
    else if (errors.length) status = "error";
    else if (warnings.length) status = "warning";

    return { ...r, errors, warnings, resolved, status };
  });
}

export function summarize(rows: ParsedRow[]) {
  const s = { ready: 0, warning: 0, error: 0, duplicate: 0, ignored: 0 };
  rows.forEach((r) => { s[r.status]++; });
  return s;
}
