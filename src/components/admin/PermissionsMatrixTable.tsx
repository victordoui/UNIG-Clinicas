import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyRound } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useAdmin';

export function PermissionsMatrixTable() {
  const { data = [], isLoading } = useRolePermissions();

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if ((data as any[]).length === 0) return <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</p>;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Papel</TableHead><TableHead>Permissão</TableHead><TableHead>Descrição</TableHead></TableRow></TableHeader>
        <TableBody>
          {(data as any[]).map((p) => <TableRow key={`${p.role}:${p.permission}`}><TableCell className="font-medium"><div>{p.role_name}</div><div className="font-mono text-xs text-muted-foreground">{p.role}</div></TableCell><TableCell><span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"><KeyRound className="h-3 w-3" />{p.permission_name}<span className="font-mono text-muted-foreground">({p.permission})</span></span></TableCell><TableCell className="text-sm text-muted-foreground">{p.description ?? '—'}</TableCell></TableRow>)}
        </TableBody>
      </Table>
    </div>
  );
}
