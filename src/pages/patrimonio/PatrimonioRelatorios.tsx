import { useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3, Download, RefreshCw, FileSpreadsheet, FileText, FileDown,
  UserX, DollarSign, Layers, Building2, Tag as TagIcon, Clock, Image as ImageIcon, FileImage,
} from "lucide-react";
import { useAssets, useAssetsAggregates, type AssetFilters } from "@/hooks/useAssets";
import { AssetSummaryCards } from "@/components/patrimonio/AssetSummaryCards";
import { AssetFiltersBar } from "@/components/patrimonio/AssetFilters";
import { PatrimonyKpiCard } from "@/components/patrimonio/PatrimonyKpiCard";
import {
  CategoryDistributionChart, ValueByCategoryChart, StatusDonutChart,
  ConditionChart, UnitRankingChart,
} from "@/components/patrimonio/PatrimonyCharts";
import { PatrimonyInsights } from "@/components/patrimonio/PatrimonyInsights";
import { PatrimonyPendingIssues } from "@/components/patrimonio/PatrimonyPendingIssues";
import { CategorySummaryTable, UnitSummaryTable } from "@/components/patrimonio/PatrimonySummaryTable";
import { PatrimonyDuplicatesTable } from "@/components/patrimonio/PatrimonyDuplicatesTable";
import { PatrimonyAcquisitionsChart } from "@/components/patrimonio/PatrimonyAcquisitionsChart";
import { PatrimonyConditionStatusChart } from "@/components/patrimonio/PatrimonyConditionStatusChart";
import { ChartExportMenu } from "@/components/patrimonio/ChartExportMenu";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

export default function PatrimonioRelatorios() {
  const [filters, setFilters] = useState<AssetFilters>({});
  const qc = useQueryClient();
  const { data: assets = [] } = useAssets(filters);
  const { aggregates } = useAssetsAggregates(filters);

  // Refs para exportação individual e do dashboard
  const dashRef = useRef<HTMLDivElement>(null);
  const refCategory = useRef<HTMLDivElement>(null);
  const refValue = useRef<HTMLDivElement>(null);
  const refStatus = useRef<HTMLDivElement>(null);
  const refCondition = useRef<HTMLDivElement>(null);
  const refUnit = useRef<HTMLDivElement>(null);
  const refAcquisitions = useRef<HTMLDivElement>(null);
  const refCondStatus = useRef<HTMLDivElement>(null);

  const buildRows = () => assets.map((a) => ({
    "Nº": a.asset_number, Nome: a.name,
    Categoria: a.category?.name ?? "", Tipo: a.type?.name ?? "",
    Unidade: a.unit?.name ?? "", Bloco: a.building?.name ?? "", Sala: a.sector?.name ?? "",
    Status: a.status, Condição: a.physical_condition,
    Marca: a.brand ?? "", Modelo: a.model ?? "",
    Valor: a.acquisition_value ?? "",
  }));

  const today = () => new Date().toISOString().slice(0, 10);
  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = buildRows();
    const headers = Object.keys(rows[0] ?? { Nº: "" });
    const csv = [headers, ...rows.map((r: any) => headers.map((h) => r[h]))]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }), `patrimonio-${today()}.csv`);
  };

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildRows()), "Patrimônio");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      aggregates.byCategory.map((c) => ({ Categoria: c.name, Quantidade: c.count, Valor: c.value, "%": c.pct.toFixed(2) }))
    ), "Por categoria");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      aggregates.byUnit.filter((u) => u.id !== "__none__").map((u) => ({ Unidade: u.name, Quantidade: u.count, Valor: u.value, "%": u.pct.toFixed(2) }))
    ), "Por unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      aggregates.byAcquisitionYear.map((y) => ({ Ano: y.year, Quantidade: y.count, Valor: y.value }))
    ), "Por ano");
    XLSX.writeFile(wb, `patrimonio-${today()}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Relatório de Patrimônio", 14, 18);
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);
    doc.setTextColor(0); doc.setFontSize(12);
    let y = 36;
    doc.text("Indicadores gerais", 14, y); y += 7;
    doc.setFontSize(10);
    const stats = [
      ["Total", aggregates.total.toLocaleString("pt-BR")],
      ["Valor total", aggregates.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
      ["Ativos", (aggregates.byStatus.ativo ?? 0).toLocaleString("pt-BR")],
      ["Em uso", (aggregates.byStatus.em_uso ?? 0).toLocaleString("pt-BR")],
      ["Em manutenção", (aggregates.byStatus.em_manutencao ?? 0).toLocaleString("pt-BR")],
      ["Danificados", (aggregates.byStatus.danificado ?? 0).toLocaleString("pt-BR")],
      ["Sem localização", aggregates.pending.semLocalizacao.toLocaleString("pt-BR")],
      ["Sem responsável", aggregates.pending.semResponsavel.toLocaleString("pt-BR")],
    ];
    stats.forEach(([k, v]) => { doc.text(`${k}: ${v}`, 14, y); y += 6; });
    y += 4; doc.setFontSize(12); doc.text("Top categorias", 14, y); y += 6; doc.setFontSize(10);
    aggregates.byCategory.slice(0, 10).forEach((c) => {
      doc.text(`${c.name} — ${c.count.toLocaleString("pt-BR")} (${c.pct.toFixed(1)}%)`, 14, y); y += 5;
      if (y > 275) { doc.addPage(); y = 20; }
    });
    doc.save(`patrimonio-${today()}.pdf`);
  };

  const exportDashboardPdf = async () => {
    if (!dashRef.current) return;
    const dataUrl = await toPng(dashRef.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
    const img = new Image();
    img.src = dataUrl;
    await new Promise((r) => (img.onload = r));
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 20;
    const imgH = (img.height * imgW) / img.width;
    // cabeçalho
    pdf.setFontSize(14); pdf.text("Dashboard de Patrimônio", 10, 10);
    pdf.setFontSize(9); pdf.setTextColor(120);
    pdf.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} · ${aggregates.total.toLocaleString("pt-BR")} bens`, 10, 15);
    pdf.setTextColor(0);
    let position = 20;
    let remaining = imgH;
    // se a imagem couber em uma página
    if (imgH <= pageH - position - 10) {
      pdf.addImage(dataUrl, "PNG", 10, position, imgW, imgH);
    } else {
      // divide em várias páginas usando slicing por y
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      const pageImgH = ((pageH - 20) * img.width) / imgW; // altura em px por página
      canvas.height = pageImgH;
      const ctx = canvas.getContext("2d")!;
      let sy = 0;
      let first = true;
      while (sy < img.height) {
        const sliceH = Math.min(pageImgH, img.height - sy);
        canvas.height = sliceH;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, sy, img.width, sliceH, 0, 0, img.width, sliceH);
        const slice = canvas.toDataURL("image/png");
        const sliceMmH = (sliceH * imgW) / img.width;
        if (!first) pdf.addPage();
        pdf.addImage(slice, "PNG", 10, first ? position : 10, imgW, sliceMmH);
        sy += sliceH;
        first = false;
        remaining -= sliceMmH;
      }
    }
    pdf.save(`dashboard-patrimonio-${today()}.pdf`);
  };

  const exportDashboardPng = async () => {
    if (!dashRef.current) return;
    const dataUrl = await toPng(dashRef.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
    const a = document.createElement("a");
    a.href = dataUrl; a.download = `dashboard-patrimonio-${today()}.png`; a.click();
  };

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");

  // Linhas para export CSV por card
  const rowsCategory = aggregates.byCategory.map((c) => ({ Categoria: c.name, Qtd: c.count, Valor: c.value, Pct: c.pct.toFixed(2) }));
  const rowsUnit = aggregates.byUnit.filter((u) => u.id !== "__none__").map((u) => ({ Unidade: u.name, Qtd: u.count, Valor: u.value, Pct: u.pct.toFixed(2) }));
  const rowsYear = aggregates.byAcquisitionYear.map((y) => ({ Ano: y.year, Qtd: y.count, Valor: y.value }));

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-5">
        <PageHeader
          icon={BarChart3}
          title="Relatórios de Patrimônio"
          description="Acompanhe indicadores, distribuição, valores, pendências e exportações da base patrimonial."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Atualizar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2"><Download className="h-4 w-4" /> Exportar</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportCsv}><FileText className="h-4 w-4 mr-2" />Base em CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportXlsx}><FileSpreadsheet className="h-4 w-4 mr-2" />Base em Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPdf}><FileDown className="h-4 w-4 mr-2" />Resumo em PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportDashboardPdf}><FileImage className="h-4 w-4 mr-2" />Dashboard em PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportDashboardPng}><ImageIcon className="h-4 w-4 mr-2" />Dashboard em PNG</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <AssetFiltersBar value={filters} onChange={setFilters} />

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Base considerada: <strong className="text-foreground">{aggregates.total.toLocaleString("pt-BR")}</strong> bens
            {hasFilters && <span className="ml-2 text-primary">(com filtros aplicados)</span>}
          </span>
          {aggregates.lastUpdated && (
            <span>Última atualização: {format(new Date(aggregates.lastUpdated), "dd/MM/yyyy HH:mm")}</span>
          )}
        </div>

        <div ref={dashRef} className="space-y-5 bg-background">
          <AssetSummaryCards filters={filters} />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <PatrimonyKpiCard label="Sem responsável" value={aggregates.pending.semResponsavel.toLocaleString("pt-BR")} icon={UserX} tone="warning" />
            <PatrimonyKpiCard label="Sem valor" value={aggregates.pending.semValor.toLocaleString("pt-BR")} icon={DollarSign} tone="neutral" />
            <PatrimonyKpiCard label="Categorias" value={aggregates.categoriesCount.toLocaleString("pt-BR")} icon={Layers} tone="info" />
            <PatrimonyKpiCard label="Unidades" value={aggregates.unitsWithAssets.toLocaleString("pt-BR")} icon={Building2} tone="info" />
            <PatrimonyKpiCard label="Maior categoria" value={aggregates.topCategory?.name ?? "—"} icon={TagIcon} tone="primary" hint={aggregates.topCategory ? `${aggregates.topCategory.count.toLocaleString("pt-BR")} itens` : undefined} />
            <PatrimonyKpiCard label="Última atualização" value={aggregates.lastUpdated ? format(new Date(aggregates.lastUpdated), "dd/MM/yy") : "—"} icon={Clock} tone="neutral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div ref={refCategory} className="relative">
              <div className="absolute right-3 top-3 z-10"><ChartExportMenu targetRef={refCategory} filename="categoria-qtd" rows={rowsCategory} /></div>
              <CategoryDistributionChart aggregates={aggregates} />
            </div>
            <div ref={refValue} className="relative">
              <div className="absolute right-3 top-3 z-10"><ChartExportMenu targetRef={refValue} filename="categoria-valor" rows={rowsCategory} /></div>
              <ValueByCategoryChart aggregates={aggregates} />
            </div>
            <div ref={refStatus} className="relative">
              <div className="absolute right-3 top-3 z-10"><ChartExportMenu targetRef={refStatus} filename="status" /></div>
              <StatusDonutChart aggregates={aggregates} />
            </div>
            <div ref={refCondition} className="relative">
              <div className="absolute right-3 top-3 z-10"><ChartExportMenu targetRef={refCondition} filename="condicao" /></div>
              <ConditionChart aggregates={aggregates} />
            </div>
            <div ref={refUnit} className="relative">
              <div className="absolute right-3 top-3 z-10"><ChartExportMenu targetRef={refUnit} filename="unidades" rows={rowsUnit} /></div>
              <UnitRankingChart aggregates={aggregates} />
            </div>
            <div ref={refAcquisitions} className="relative">
              <div className="absolute right-3 top-3 z-10"><ChartExportMenu targetRef={refAcquisitions} filename="aquisicoes-ano" rows={rowsYear} /></div>
              <PatrimonyAcquisitionsChart aggregates={aggregates} />
            </div>
            <div ref={refCondStatus} className="relative lg:col-span-2">
              <div className="absolute right-3 top-3 z-10"><ChartExportMenu targetRef={refCondStatus} filename="condicao-status" /></div>
              <PatrimonyConditionStatusChart aggregates={aggregates} />
            </div>
            <PatrimonyInsights aggregates={aggregates} />
          </div>

          <PatrimonyPendingIssues
            aggregates={aggregates}
            extended
            title="Saneamento da base"
            subtitle="Pendências, inconsistências e dados que precisam de correção"
          />

          <PatrimonyDuplicatesTable aggregates={aggregates} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategorySummaryTable aggregates={aggregates} />
            <UnitSummaryTable aggregates={aggregates} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
