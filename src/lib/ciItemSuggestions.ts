// Catálogo de sugestões de itens por destino institucional.
// Lista estática mantida no código (sem chamada a banco) para usar em datalist
// e para reconhecer/normalizar descrições durante a importação em lote.

export interface ItemSuggestion {
  descricao: string;
  unidade?: string;
}

const ALMOXARIFADO: ItemSuggestion[] = [
  { descricao: 'Fita durex transparente 45x40', unidade: 'UN' },
  { descricao: 'Fita durex transparente 24x40', unidade: 'UN' },
  { descricao: 'Fita crepe 45x40', unidade: 'UN' },
  { descricao: 'Fita crepe 24x10', unidade: 'UN' },
  { descricao: 'Marca texto amarelo', unidade: 'UN' },
  { descricao: 'Marca texto verde', unidade: 'UN' },
  { descricao: 'Marca texto rosa', unidade: 'UN' },
  { descricao: 'Marca texto laranja', unidade: 'UN' },
  { descricao: 'Caneta esferográfica azul', unidade: 'UN' },
  { descricao: 'Caneta esferográfica preta', unidade: 'UN' },
  { descricao: 'Caneta esferográfica vermelha', unidade: 'UN' },
  { descricao: 'Caneta de quadro azul (Pilot V Board Master)', unidade: 'UN' },
  { descricao: 'Caneta de quadro preta (Pilot V Board Master)', unidade: 'UN' },
  { descricao: 'Lápis preto nº 2', unidade: 'UN' },
  { descricao: 'Borracha branca', unidade: 'UN' },
  { descricao: 'Apontador com depósito', unidade: 'UN' },
  { descricao: 'Papel A4 75g (resma 500fl)', unidade: 'RESMA' },
  { descricao: 'Papel A3 75g', unidade: 'RESMA' },
  { descricao: 'Envelope ofício pardo', unidade: 'UN' },
  { descricao: 'Clipes nº 2/0', unidade: 'CX' },
  { descricao: 'Clipes nº 6/0', unidade: 'CX' },
  { descricao: 'Grampo 26/6', unidade: 'CX' },
  { descricao: 'Grampeador médio', unidade: 'UN' },
  { descricao: 'Furador de papel', unidade: 'UN' },
  { descricao: 'Tesoura multiuso 21cm', unidade: 'UN' },
  { descricao: 'Cola branca 90g', unidade: 'UN' },
  { descricao: 'Cola bastão 40g', unidade: 'UN' },
  { descricao: 'Pasta AZ ofício', unidade: 'UN' },
  { descricao: 'Pasta plástica com elástico', unidade: 'UN' },
  { descricao: 'Bloco autoadesivo (post-it) 76x76', unidade: 'UN' },
  { descricao: 'Bloco de anotações pautado', unidade: 'UN' },
  { descricao: 'Régua acrílica 30cm', unidade: 'UN' },
  { descricao: 'Apagador para quadro branco', unidade: 'UN' },
  { descricao: 'Pincel atômico preto', unidade: 'UN' },
  { descricao: 'Pincel atômico azul', unidade: 'UN' },
  { descricao: 'Pincel atômico vermelho', unidade: 'UN' },
];

const TI: ItemSuggestion[] = [
  { descricao: 'Mouse USB com fio', unidade: 'UN' },
  { descricao: 'Mouse sem fio', unidade: 'UN' },
  { descricao: 'Teclado ABNT2 USB', unidade: 'UN' },
  { descricao: 'Cabo HDMI 2m', unidade: 'UN' },
  { descricao: 'Cabo HDMI 5m', unidade: 'UN' },
  { descricao: 'Cabo VGA 2m', unidade: 'UN' },
  { descricao: 'Cabo de rede Cat6 patch 2m', unidade: 'UN' },
  { descricao: 'Pen drive 32GB', unidade: 'UN' },
  { descricao: 'Pen drive 64GB', unidade: 'UN' },
  { descricao: 'Pilha AA (cartela com 4)', unidade: 'CX' },
  { descricao: 'Pilha AAA (cartela com 4)', unidade: 'CX' },
  { descricao: 'Adaptador HDMI-VGA', unidade: 'UN' },
  { descricao: 'Filtro de linha 5 tomadas', unidade: 'UN' },
  { descricao: 'Toner para impressora (especificar modelo)', unidade: 'UN' },
];

const COMPRAS: ItemSuggestion[] = [
  ...ALMOXARIFADO,
  ...TI,
];

const FINANCEIRO: ItemSuggestion[] = [
  { descricao: 'Talão de recibo', unidade: 'UN' },
  { descricao: 'Bobina térmica 80x40', unidade: 'RL' },
];

const ADMINISTRATIVO: ItemSuggestion[] = ALMOXARIFADO;

const JURIDICO: ItemSuggestion[] = [
  { descricao: 'Papel timbrado A4', unidade: 'RESMA' },
];

const CATALOG: Record<string, ItemSuggestion[]> = {
  'Almoxarifado': ALMOXARIFADO,
  'TI': TI,
  'Compras': COMPRAS,
  'Financeiro': FINANCEIRO,
  'Administrativo': ADMINISTRATIVO,
  'Jurídico': JURIDICO,
};

export function getSuggestionsForDestination(dest?: string | null): ItemSuggestion[] {
  if (!dest) return [];
  return CATALOG[dest] ?? [];
}

export function normalizeDescription(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findSuggestionMatch(desc: string, dest?: string | null): ItemSuggestion | null {
  const norm = normalizeDescription(desc);
  if (!norm) return null;
  const list = getSuggestionsForDestination(dest);
  // match exato primeiro, depois match parcial (uma string contém a outra).
  const exact = list.find((s) => normalizeDescription(s.descricao) === norm);
  if (exact) return exact;
  const partial = list.find((s) => {
    const n = normalizeDescription(s.descricao);
    return n.includes(norm) || norm.includes(n);
  });
  return partial ?? null;
}

export const BULK_ALLOWED_UNITS = [
  'UN', 'CX', 'PCT', 'KIT', 'RESMA', 'ROLO', 'RL', 'PAR', 'KG', 'G', 'L', 'ML',
  'H', 'MÊS', 'MES', 'DIÁRIA', 'DIARIA', 'CONTRATO', 'M', 'M²', 'M2', 'M³', 'M3',
];

export const BULK_LIMITS = {
  MAX_ITEMS: 200,
  MAX_TEXT_CHARS: 20000,
  MAX_DESC_CHARS: 200,
  MIN_DESC_CHARS: 2,
  MAX_QTY: 9999,
  MAX_CUSTOM_UNIT_CHARS: 12,
};
