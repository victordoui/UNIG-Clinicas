import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Pencil, Power } from 'lucide-react';
import { useAdminUnits, useToggleUnitStatus, type UnitInput } from '@/hooks/useAdmin';
import { UnitFormDialog } from '@/components/admin/UnitFormDialog';
import { toast } from '@/hooks/use-toast';

export default function AdminUnidades() {
  const { data: units = [], isLoading } = useAdminUnits();
  const toggle = useToggleUnitStatus();
  const [editing, setEditing] = useState<(UnitInput & { id: string }) | null>(null);
  const [open, setOpen] = useState(false);

  const onToggle = async (u: any) => {
    try { await toggle.mutateAsync({ id: u.id, is_active: !u.is_active }); toast({ title: u.is_active ? 'Unidade desativada' : 'Unidade ativada' }); }
    catch (e: any) { toast({ title: 'Erro', description: e?.message, variant: 'destructive' }); }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Unidades</h1>
              <p className="text-sm text-muted-foreground">Cadastro de unidades e campi.</p>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Nova unidade</Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Carregando…</TableCell></TableRow>}
              {!isLoading && (units as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma unidade</TableCell></TableRow>}
              {(units as any[]).map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.code}</TableCell>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.city}/{u.state}</TableCell>
                  <TableCell className="text-xs">{u.phone ?? '—'}<br />{u.email ?? ''}</TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? 'default' : 'secondary'}>{u.is_active ? 'Ativa' : 'Inativa'}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(u); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => onToggle(u)}><Power className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <UnitFormDialog open={open} onOpenChange={setOpen} unit={editing} />
      </div>
    </MainLayout>
  );
}
