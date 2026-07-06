export interface ParsedBulkItem {
  quantidade: number;
  descricao: string;
  raw: string;
  ok: boolean;
}

const SEPARATORS = ['—', '–', '-'];

/**
 * Parse uma linha no formato "QUANTIDADE - DESCRIÇÃO".
 * Mantém hífens internos da descrição (só consome o primeiro separador depois do número).
 */
export function parseBulkLine(line: string): ParsedBulkItem {
  const raw = line;
  const trimmed = line.trim();
  if (!trimmed) return { quantidade: 0, descricao: '', raw, ok: false };

  // Captura: número inicial + separador (-, –, —) + resto
  const match = trimmed.match(/^(\d+)\s*[-–—xX]\s*(.+)$/);
  if (match) {
    const qty = parseInt(match[1], 10);
    const desc = match[2].trim();
    if (qty > 0 && desc.length > 0) {
      return { quantidade: qty, descricao: desc, raw, ok: true };
    }
  }

  // Fallback: "30 descrição"
  const fallback = trimmed.match(/^(\d+)\s+(.+)$/);
  if (fallback) {
    const qty = parseInt(fallback[1], 10);
    const desc = fallback[2].trim();
    if (qty > 0 && desc.length > 0) {
      return { quantidade: qty, descricao: desc, raw, ok: true };
    }
  }

  return { quantidade: 1, descricao: trimmed, raw, ok: false };
}

export function parseBulkText(text: string): ParsedBulkItem[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(parseBulkLine);
}

export const BULK_TEMPLATE_TXT = `30 - Fita durex transparente 45x40
30 - Fita durex transparente 24x40
48 - Marca texto amarelo
36 - Caneta de quadro azul (Pilot - V Board Master)
20 - Tesoura multiuso 21cm
05 - Furador de papel`;
