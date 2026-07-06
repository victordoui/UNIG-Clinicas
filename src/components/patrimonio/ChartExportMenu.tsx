import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Image as ImageIcon, FileText } from "lucide-react";
import { toPng } from "html-to-image";

interface Props {
  targetRef: RefObject<HTMLElement>;
  filename: string;
  rows?: Record<string, any>[];
}

export function ChartExportMenu({ targetRef, filename, rows }: Props) {
  const exportPng = async () => {
    if (!targetRef.current) return;
    const url = await toPng(targetRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.png`; a.click();
  };
  const exportCsv = () => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers, ...rows.map((r) => headers.map((h) => r[h]))]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Exportar gráfico">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPng}>
          <ImageIcon className="h-4 w-4 mr-2" /> PNG
        </DropdownMenuItem>
        {rows && rows.length > 0 && (
          <DropdownMenuItem onClick={exportCsv}>
            <FileText className="h-4 w-4 mr-2" /> CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
