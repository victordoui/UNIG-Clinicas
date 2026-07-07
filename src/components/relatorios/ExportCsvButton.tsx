import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadCSV } from '@/lib/reports';

export function ExportCsvButton({ rows, filename, label = 'Exportar CSV' }: {
  rows: Record<string, any>[]; filename: string; label?: string;
}) {
  return (
    <Button variant="outline" size="sm" onClick={() => downloadCSV(rows, filename)} disabled={!rows.length}>
      <Download className="h-4 w-4 mr-1" /> {label}
    </Button>
  );
}
