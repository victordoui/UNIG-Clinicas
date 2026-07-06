import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  DEMAND_STATUS_LABEL, DEMAND_PRIORITY_LABEL, DEMAND_TYPE_LABEL, OperationalDemand,
} from '@/hooks/useOperationalDemands';

export interface DemandExportFilters {
  unidade?: string;
  gestorNome?: string;
  status?: string[];
}

function summarize(rows: OperationalDemand[]) {
  const byStatus = new Map<string, number>();
  const byUnit = new Map<string, number>();
  const byManager = new Map<string, number>();
  rows.forEach((d) => {
    byStatus.set(d.status, (byStatus.get(d.status) ?? 0) + 1);
    byUnit.set(d.unidade || '—', (byUnit.get(d.unidade) ?? 0) + 1);
    const m = d.gestor?.full_name ?? '—';
    byManager.set(m, (byManager.get(m) ?? 0) + 1);
  });
  return { byStatus, byUnit, byManager };
}

export function exportDemandsToExcel(rows: OperationalDemand[], filters: DemandExportFilters) {
  const { byStatus, byUnit, byManager } = summarize(rows);
  const wb = XLSX.utils.book_new();

  const resumo = [
    ['Central de Demandas — Relatório'],
    ['Gerado em', format(new Date(), 'dd/MM/yyyy HH:mm')],
    [],
    ['Filtros'],
    ['Unidade', filters.unidade || 'Todas'],
    ['Gestor', filters.gestorNome || 'Todos'],
    ['Status', filters.status?.length ? filters.status.map((s) => DEMAND_STATUS_LABEL[s as keyof typeof DEMAND_STATUS_LABEL]).join(', ') : 'Todos'],
    [],
    ['Total de demandas', rows.length],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo');

  const toSheet = (m: Map<string, number>, header: string) => {
    const rows = [[header, 'Quantidade'], ...Array.from(m.entries()).sort((a, b) => b[1] - a[1])];
    return XLSX.utils.aoa_to_sheet(rows);
  };
  XLSX.utils.book_append_sheet(
    wb,
    toSheet(
      new Map(Array.from(byStatus.entries()).map(([k, v]) => [DEMAND_STATUS_LABEL[k as keyof typeof DEMAND_STATUS_LABEL] ?? k, v])),
      'Status',
    ),
    'Por Status',
  );
  XLSX.utils.book_append_sheet(wb, toSheet(byUnit, 'Unidade'), 'Por Unidade');
  XLSX.utils.book_append_sheet(wb, toSheet(byManager, 'Gestor'), 'Por Gestor');

  const lista = rows.map((d) => ({
    Código: d.code,
    Nome: d.nome,
    Unidade: d.unidade,
    Área: d.area ?? '',
    Tipo: DEMAND_TYPE_LABEL[d.tipo] ?? d.tipo,
    Prioridade: DEMAND_PRIORITY_LABEL[d.prioridade] ?? d.prioridade,
    Status: DEMAND_STATUS_LABEL[d.status] ?? d.status,
    Gestor: d.gestor?.full_name ?? '',
    Prazo: d.prazo_estimado ? format(new Date(d.prazo_estimado), 'dd/MM/yyyy') : '',
    Atrasada: d.is_overdue ? 'Sim' : 'Não',
    'Criada em': format(new Date(d.created_at), 'dd/MM/yyyy HH:mm'),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lista), 'Lista detalhada');

  XLSX.writeFile(wb, `demandas_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}

export function exportDemandsToPDF(rows: OperationalDemand[], filters: DemandExportFilters) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const { byStatus } = summarize(rows);

  doc.setFontSize(16);
  doc.text('Central de Demandas — Relatório', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, 58);

  const filtersTxt = [
    `Unidade: ${filters.unidade || 'Todas'}`,
    `Gestor: ${filters.gestorNome || 'Todos'}`,
    `Status: ${filters.status?.length ? filters.status.map((s) => DEMAND_STATUS_LABEL[s as keyof typeof DEMAND_STATUS_LABEL]).join(', ') : 'Todos'}`,
    `Total: ${rows.length}`,
  ].join('   •   ');
  doc.text(filtersTxt, 40, 74);

  autoTable(doc, {
    startY: 90,
    head: [['Status', 'Qtd']],
    body: Array.from(byStatus.entries()).map(([k, v]) => [DEMAND_STATUS_LABEL[k as keyof typeof DEMAND_STATUS_LABEL] ?? k, String(v)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [234, 88, 12] },
    margin: { left: 40, right: 40 },
    tableWidth: 220,
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 16,
    head: [['Código', 'Nome', 'Unidade', 'Tipo', 'Prioridade', 'Status', 'Gestor', 'Prazo', 'Atrasada']],
    body: rows.map((d) => [
      d.code,
      d.nome,
      d.unidade,
      DEMAND_TYPE_LABEL[d.tipo] ?? d.tipo,
      DEMAND_PRIORITY_LABEL[d.prioridade] ?? d.prioridade,
      DEMAND_STATUS_LABEL[d.status] ?? d.status,
      d.gestor?.full_name ?? '',
      d.prazo_estimado ? format(new Date(d.prazo_estimado), 'dd/MM/yyyy') : '',
      d.is_overdue ? 'Sim' : '—',
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [234, 88, 12] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`demandas_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}

/** Resumo para diretoria — consolidado por gestor (PDF). */
export function exportManagerSummaryPDF(rows: OperationalDemand[], summaryText: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text('Resumo para Diretoria — UNIG Facilities', 40, 40);
  doc.setFontSize(10); doc.setTextColor(110);
  doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, 58);

  doc.setTextColor(0); doc.setFontSize(10);
  const wrapped = doc.splitTextToSize(summaryText, 515);
  doc.text(wrapped, 40, 80);

  const startY = 80 + wrapped.length * 12 + 18;

  // Consolidado por gestor
  const byManager = new Map<string, OperationalDemand[]>();
  rows.forEach((d) => {
    const k = d.gestor?.full_name ?? '—';
    if (!byManager.has(k)) byManager.set(k, []);
    byManager.get(k)!.push(d);
  });

  const tableBody: any[] = [];
  Array.from(byManager.entries()).forEach(([nome, list]) => {
    tableBody.push([{ content: nome, colSpan: 5, styles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' } }]);
    list.forEach((d) => {
      tableBody.push([
        d.code, d.nome,
        DEMAND_STATUS_LABEL[d.status] ?? d.status,
        DEMAND_PRIORITY_LABEL[d.prioridade] ?? d.prioridade,
        d.prazo_estimado ? format(new Date(d.prazo_estimado), 'dd/MM/yyyy') : '—',
      ]);
    });
  });

  autoTable(doc, {
    startY,
    head: [['Código', 'Demanda', 'Status', 'Prioridade', 'Prazo']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`resumo_diretoria_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
}

/** Resumo para diretoria — consolidado por gestor (Excel). */
export function exportManagerSummaryExcel(rows: OperationalDemand[], summaryText: string) {
  const wb = XLSX.utils.book_new();
  const cap = [
    ['Resumo para Diretoria — UNIG Facilities'],
    ['Gerado em', format(new Date(), 'dd/MM/yyyy HH:mm')],
    [],
    ['Resumo'],
    [summaryText],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cap), 'Resumo');

  const byManager = new Map<string, OperationalDemand[]>();
  rows.forEach((d) => {
    const k = d.gestor?.full_name ?? '—';
    if (!byManager.has(k)) byManager.set(k, []);
    byManager.get(k)!.push(d);
  });
  byManager.forEach((list, nome) => {
    const ws = XLSX.utils.json_to_sheet(list.map((d) => ({
      Código: d.code, Demanda: d.nome, Unidade: d.unidade,
      Status: DEMAND_STATUS_LABEL[d.status] ?? d.status,
      Prioridade: DEMAND_PRIORITY_LABEL[d.prioridade] ?? d.prioridade,
      Prazo: d.prazo_estimado ? format(new Date(d.prazo_estimado), 'dd/MM/yyyy') : '',
      'Próximas etapas': d.proximas_etapas ?? '',
      'Pontos de atenção': (d as any).attention_points ?? '',
    })));
    XLSX.utils.book_append_sheet(wb, ws, nome.substring(0, 28) || 'Gestor');
  });

  XLSX.writeFile(wb, `resumo_diretoria_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
}

