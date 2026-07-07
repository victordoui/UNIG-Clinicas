import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChannelBadge, StatusBadge } from './ChannelBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatDateTime, TARGET_TYPE_LABEL, type CommTargetType } from '@/lib/communication';

export function CommunicationListTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-8 text-center">Nenhum comunicado direcionado.</p>;
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enviado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium max-w-[240px] truncate">{r.title}</TableCell>
              <TableCell>{TARGET_TYPE_LABEL[r.target_type as CommTargetType] ?? r.target_type}</TableCell>
              <TableCell><ChannelBadge channel={r.channel} /></TableCell>
              <TableCell><PriorityBadge priority={r.priority} /></TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.sent_at ?? r.scheduled_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
