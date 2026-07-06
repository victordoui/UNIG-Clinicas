import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  product_created: "Produto Criado",
  product_updated: "Produto Atualizado",
  product_deleted: "Produto Excluído",
  movement_created: "Movimentação",
  user_invited: "Usuário Convidado",
  user_removed: "Usuário Removido",
};

export const CRITICAL_ACTIONS = new Set<string>([
  "product_deleted",
  "user_removed",
  "approval_rejected",
  "role_changed",
  "permission_changed",
  "organization_deleted",
]);

interface ExportOpts {
  logs: any[];
  filters: {
    organization?: string | null;
    user?: string | null;
    action?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    onlyCritical?: boolean;
  };
}

export function exportAuditLogsToPdf({ logs, filters }: ExportOpts) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("Relatório de Auditoria e Logs", 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const meta: string[] = [];
  meta.push(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`);
  if (filters.organization) meta.push(`Organização: ${filters.organization}`);
  if (filters.user) meta.push(`Usuário: ${filters.user}`);
  if (filters.action && filters.action !== "all")
    meta.push(`Ação: ${ACTION_LABELS[filters.action] || filters.action}`);
  if (filters.startDate)
    meta.push(`De: ${format(filters.startDate, "dd/MM/yyyy", { locale: ptBR })}`);
  if (filters.endDate)
    meta.push(`Até: ${format(filters.endDate, "dd/MM/yyyy", { locale: ptBR })}`);
  if (filters.onlyCritical) meta.push("Somente críticos");
  meta.push(`Registros: ${logs.length}`);
  doc.text(meta.join("  |  "), 14, 22);

  const body = logs.map((l) => [
    format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    l.organizations?.name || "—",
    l.profiles?.full_name || "—",
    l.profiles?.email || "—",
    ACTION_LABELS[l.action] || l.action,
    CRITICAL_ACTIONS.has(l.action) ? "Sim" : "—",
    l.ip_address || "—",
  ]);

  autoTable(doc, {
    startY: 28,
    head: [["Data/Hora", "Organização", "Usuário", "E-mail", "Ação", "Crítico", "IP"]],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 100, 200], textColor: 255 },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5 && data.cell.raw === "Sim") {
        data.cell.styles.fillColor = [254, 226, 226];
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      const page = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Página ${page} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 30,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  doc.save(`auditoria_${format(new Date(), "yyyy-MM-dd_HHmm")}.pdf`);
}
