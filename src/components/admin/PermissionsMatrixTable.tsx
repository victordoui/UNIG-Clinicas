import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useAdmin';
import { UNIG_ROLE_LABEL, type UnigRole } from '@/lib/unigRoles';

export function PermissionsMatrixTable() {
  const { data = [], isLoading } = useRolePermissions();

  const { modules, roles, byKey } = useMemo(() => {
    const modules = Array.from(new Set((data as any[]).map(p => p.module))).sort();
    const roles = Array.from(new Set((data as any[]).map(p => p.role))).sort();
    const byKey: Record<string, any> = {};
    for (const p of data as any[]) byKey[`${p.role}::${p.module}`] = p;
    return { modules, roles, byKey };
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (modules.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada.</p>;

  const Ico = ({ v }: { v: boolean }) => v
    ? <Check className="h-3.5 w-3.5 text-emerald-600 inline" />
    : <X className="h-3.5 w-3.5 text-muted-foreground inline" />;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Módulo</TableHead>
            {roles.map(r => (
              <TableHead key={r} className="text-center text-xs">
                {UNIG_ROLE_LABEL[r as UnigRole] ?? r}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map(m => (
            <TableRow key={m}>
              <TableCell className="font-medium">{m}</TableCell>
              {roles.map(r => {
                const p = byKey[`${r}::${m}`];
                if (!p) return <TableCell key={r} className="text-center text-muted-foreground text-xs">—</TableCell>;
                return (
                  <TableCell key={r} className="text-center text-[11px]">
                    <div className="flex flex-col gap-0.5 items-center">
                      <span title="Ler"><Ico v={p.can_read} /> R</span>
                      <span title="Criar"><Ico v={p.can_create} /> C</span>
                      <span title="Editar"><Ico v={p.can_update} /> U</span>
                      <span title="Excluir"><Ico v={p.can_delete} /> D</span>
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
