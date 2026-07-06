import * as XLSX from "xlsx";

export const IMPORT_COLUMNS = [
  { key: "asset_number", label: "Nº Patrimônio*", required: true },
  { key: "internal_code", label: "Código Interno" },
  { key: "name", label: "Descrição*", required: true },
  { key: "category", label: "Categoria*", required: true },
  { key: "type", label: "Tipo" },
  { key: "unit", label: "Unidade*", required: true },
  { key: "building", label: "Bloco" },
  { key: "sector", label: "Setor/Sala" },
  { key: "subspace", label: "Subespaço" },
  { key: "specific_location", label: "Local Específico" },
  { key: "responsible_email", label: "Responsável (e-mail)" },
  { key: "physical_condition", label: "Estado Físico" },
  { key: "status", label: "Status" },
  { key: "brand", label: "Marca" },
  { key: "model", label: "Modelo" },
  { key: "serial_number", label: "Nº de Série" },
  { key: "color", label: "Cor" },
  { key: "material", label: "Material" },
  { key: "invoice_number", label: "Nota Fiscal" },
  { key: "acquisition_date", label: "Data Aquisição (dd/mm/aaaa)" },
  { key: "acquisition_value", label: "Valor (R$)" },
  { key: "warranty_until", label: "Garantia até (dd/mm/aaaa)" },
  { key: "notes", label: "Observações" },
] as const;

export const VALID_STATUS = [
  "ativo", "em_uso", "em_manutencao", "reserva",
  "danificado", "sem_localizacao", "transferido", "baixado", "extraviado",
];
export const VALID_CONDITION = ["novo", "bom", "regular", "ruim", "inservivel"];

export interface TemplateLists {
  categories: string[];
  units: string[];
  buildings: string[];
  sectors: string[];
  /** Optional: types grouped by category name for a dedicated reference sheet. */
  typesByCategory?: Record<string, string[]>;
}


export function downloadImportTemplate(lists: TemplateLists) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Patrimônios (headers + example row)
  const headers = IMPORT_COLUMNS.map((c) => c.label);
  const example = [
    "PAT-0001", "INT-0001", "Cadeira Ergonômica Presidente",
    lists.categories[0] ?? "Mobiliário", "", lists.units[0] ?? "Sede", "",
    "", "", "", "", "bom", "ativo",
    "Flexform", "Presidente", "SN-123", "Preto", "Aço/Tecido",
    "NF-000123", "15/03/2024", "1200,00", "15/03/2026",
    "Item de exemplo — apague antes de importar",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, "Patrimônios");

  // Sheet 2 — Instruções
  const instr = [
    ["Instruções de preenchimento"],
    [],
    ["• Campos marcados com * são obrigatórios."],
    ["• Não altere os títulos das colunas — a importação usa o cabeçalho para mapear."],
    ["• Datas: use o formato dd/mm/aaaa."],
    ["• Valores em Reais: use vírgula como separador decimal (ex.: 1200,50)."],
    ["• Categoria, Unidade, Bloco e Setor devem existir no cadastro (aba 'Listas válidas')."],
    ["• Tipo deve pertencer à categoria escolhida — consulte a aba 'Tipos por Categoria'."],

    ["• Duplicidade é verificada por Nº Patrimônio, Nº de Série e Código Interno."],
    ["• Estados físicos válidos: " + VALID_CONDITION.join(", ")],
    ["• Status válidos: " + VALID_STATUS.join(", ")],
    [],
    ["A importação passa por uma etapa de conferência antes de gravar no banco."],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instr), "Instruções");

  // Sheet 3 — Listas válidas
  const maxLen = Math.max(
    lists.categories.length, lists.units.length,
    lists.buildings.length, lists.sectors.length,
    VALID_STATUS.length, VALID_CONDITION.length,
  );
  const rows: any[][] = [["Categorias", "Unidades", "Blocos", "Setores", "Status", "Estado Físico"]];
  for (let i = 0; i < maxLen; i++) {
    rows.push([
      lists.categories[i] ?? "",
      lists.units[i] ?? "",
      lists.buildings[i] ?? "",
      lists.sectors[i] ?? "",
      VALID_STATUS[i] ?? "",
      VALID_CONDITION[i] ?? "",
    ]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(rows);
  ws3["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Listas válidas");

  // Sheet 4 — Tipos por Categoria (taxonomia oficial)
  if (lists.typesByCategory && Object.keys(lists.typesByCategory).length) {
    const catNames = Object.keys(lists.typesByCategory);
    const colMax = Math.max(...catNames.map((c) => lists.typesByCategory![c].length), 0);
    const tRows: any[][] = [catNames];
    for (let i = 0; i < colMax; i++) {
      tRows.push(catNames.map((c) => lists.typesByCategory![c][i] ?? ""));
    }
    const ws4 = XLSX.utils.aoa_to_sheet(tRows);
    ws4["!cols"] = catNames.map(() => ({ wch: 26 }));
    XLSX.utils.book_append_sheet(wb, ws4, "Tipos por Categoria");
  }

  XLSX.writeFile(wb, `modelo-importacao-patrimonio.xlsx`);
}


export function downloadErrorReport(rows: Array<Record<string, any>>) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Erros");
  XLSX.writeFile(wb, `relatorio-importacao-erros.xlsx`);
}
