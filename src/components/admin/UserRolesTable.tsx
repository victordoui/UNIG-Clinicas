import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Search } from 'lucide-react';
import { useAdminUsers, useRevokeRole, type AdminUserRow } from '@/hooks/useAdmin';
import { UNIG_ROLE_BADGE, UNIG_ROLE_LABEL, type UnigRole } from '@/lib/unigRoles';
import { AssignRoleDialog } from './AssignRoleDialog';
import { toast } from '@/hooks/use-toast';

export function UserRolesTable() {
  const [search, setSearch] = useState('');
  const [assignFor, setAssignFor] = useState<AdminUserRow | null>(null);
  const { data: users = [], isLoading } = useAdminUsers(search);
  const revoke = useRevokeRole();

  const onRevoke = async (id: string, label: string) => {
    if (!confirm(`Revogar papel "${label}"?`)) return;
    try { await revoke.mutateAsync(id); toast({ title: 'Papel revogado' }); }
    catch (e: any) { toast({ title: 'Erro', description: e?.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou e-mail…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papéis ativos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>}
            {!isLoading && users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum usuário</TableCell></TableRow>}
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.is_super_admin && <Badge className={UNIG_ROLE_BADGE.super_admin} variant="outline">Super Admin</Badge>}
                    {u.roles.map(r => (
                      <Badge key={r.id} variant="outline" className={`${UNIG_ROLE_BADGE[r.role as UnigRole] ?? ''} gap-1 pr-1`}>
                        {UNIG_ROLE_LABEL[r.role as UnigRole] ?? r.role}
                        <button
                          type="button"
                          onClick={() => onRevoke(r.id, UNIG_ROLE_LABEL[r.role as UnigRole] ?? r.role)}
                          className="hover:bg-black/10 rounded p-0.5"
                          title="Revogar"
                        ><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                    {u.roles.length === 0 && !u.is_super_admin && <span className="text-xs text-muted-foreground">Sem papéis</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.status === 'ativo' ? 'default' : 'secondary'}>{u.status}</Badge>
                  {u.password_change_required && <Badge variant="outline" className="ml-1 text-xs">Troca senha</Badge>}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => setAssignFor(u)}><Plus className="h-3 w-3 mr-1" />Papel</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {assignFor && (
        <AssignRoleDialog
          open={!!assignFor}
          onOpenChange={v => !v && setAssignFor(null)}
          userId={assignFor.id}
          userName={assignFor.full_name}
        />
      )}
    </div>
  );
}
