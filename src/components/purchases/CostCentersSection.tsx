import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Building2, Save, X, Users } from 'lucide-react';
import { isStaff } from '@/lib/unigRoles';
import { useCostCenters, useUpsertCostCenter, useDeleteCostCenter, type CostCenter } from '@/hooks/useCostCenters';
import { UserCostCenterLinks } from './UserCostCenterLinks';

export function CostCentersSection() {
  const { unigRole } = useAuth();
  const { toast } = useToast();
  const canManage = isStaff(unigRole);
  const { data: list = [], isLoading } = useCostCenters();
  const upsert = useUpsertCostCenter();
  const del = useDeleteCostCenter();
  const [editing, setEditing] = useState<Partial<CostCenter> | null>(null);
  const [linksFor, setLinksFor] = useState<CostCenter | null>(null);

  if (!canManage) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        Apenas administradores e gerentes podem gerenciar centros de custo.
      </CardContent></Card>
    );
  }

  const startNew = () => setEditing({ nome: '', codigo: '', ativo: true });
  const startEdit = (cc: CostCenter) => setEditing(cc);
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing?.nome?.trim() || !editing?.codigo?.trim()) {
      return toast({ title: 'Preencha nome e código', variant: 'destructive' });
    }
    await upsert.mutateAsync(editing as CostCenter);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Centros de Custo</CardTitle>
          {!editing && <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-2" /> Novo</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Categorize gastos por departamento ou projeto. Pode ser opcional na solicitação de compra.
          </p>

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end p-4 border rounded-lg bg-muted/30">
              <div>
                <label className="text-xs text-muted-foreground">Código *</label>
                <Input value={editing.codigo ?? ''} onChange={e => setEditing({ ...editing, codigo: e.target.value })} placeholder="CC001" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Nome *</label>
                <Input value={editing.nome ?? ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} placeholder="Marketing" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.ativo ?? true} onCheckedChange={v => setEditing({ ...editing, ativo: v })} />
                <span className="text-sm">Ativo</span>
              </div>
              <div className="md:col-span-4 flex gap-2 justify-end">
                <Button variant="ghost" onClick={cancel}><X className="h-4 w-4 mr-2" />Cancelar</Button>
                <Button onClick={save} disabled={upsert.isPending}><Save className="h-4 w-4 mr-2" />Salvar</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground">Carregando…</div>
          ) : list.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">Nenhum centro de custo.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(cc => (
                  <TableRow key={cc.id}>
                    <TableCell className="font-mono text-xs">{cc.codigo}</TableCell>
                    <TableCell>{cc.nome}</TableCell>
                    <TableCell><Badge variant={cc.ativo ? 'default' : 'secondary'}>{cc.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Vínculos" onClick={() => setLinksFor(linksFor?.id === cc.id ? null : cc)}><Users className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(cc)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(cc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {linksFor && <UserCostCenterLinks costCenter={linksFor as CostCenter} />}
    </div>
  );
}
