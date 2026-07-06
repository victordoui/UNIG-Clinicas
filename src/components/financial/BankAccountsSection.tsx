import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Landmark, Save, X } from 'lucide-react';
import { useBankAccounts, useUpsertBankAccount, useDeleteBankAccount, type BankAccount } from '@/hooks/useBankAccounts';

export function BankAccountsSection() {
  const { currentRole } = useAuth();
  const { toast } = useToast();
  const canManage = currentRole === 'admin';
  const { data: list = [], isLoading } = useBankAccounts();
  const upsert = useUpsertBankAccount();
  const del = useDeleteBankAccount();
  const [editing, setEditing] = useState<Partial<BankAccount> | null>(null);

  if (!canManage) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        Apenas administradores podem gerenciar contas bancárias.
      </CardContent></Card>
    );
  }

  const startNew = () => setEditing({ nome: '', tipo: 'corrente', saldo_inicial: 0, ativo: true });
  const cancel = () => setEditing(null);
  const save = async () => {
    if (!editing?.nome?.trim()) return toast({ title: 'Informe o nome', variant: 'destructive' });
    await upsert.mutateAsync(editing);
    setEditing(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Contas Bancárias</CardTitle>
        {!editing && <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-2" />Nova</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Cadastre contas bancárias e caixas usados em pagamentos.</p>

        {editing && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-4 border rounded-lg bg-muted/30">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Nome *</label>
              <Input value={editing.nome ?? ''} onChange={e => setEditing({ ...editing, nome: e.target.value })} placeholder="Itaú Conta Principal" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Banco</label>
              <Input value={editing.banco ?? ''} onChange={e => setEditing({ ...editing, banco: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Agência</label>
              <Input value={editing.agencia ?? ''} onChange={e => setEditing({ ...editing, agencia: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Conta</label>
              <Input value={editing.conta ?? ''} onChange={e => setEditing({ ...editing, conta: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={editing.tipo ?? 'corrente'} onValueChange={v => setEditing({ ...editing, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Saldo inicial</label>
              <Input type="number" step="0.01" value={editing.saldo_inicial ?? 0} onChange={e => setEditing({ ...editing, saldo_inicial: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.ativo ?? true} onCheckedChange={v => setEditing({ ...editing, ativo: v })} />
              <span className="text-sm">Ativa</span>
            </div>
            <div className="md:col-span-6 flex gap-2 justify-end">
              <Button variant="ghost" onClick={cancel}><X className="h-4 w-4 mr-2" />Cancelar</Button>
              <Button onClick={save} disabled={upsert.isPending}><Save className="h-4 w-4 mr-2" />Salvar</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground">Carregando…</div>
        ) : list.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">Nenhuma conta cadastrada.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Ag/Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Saldo inicial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nome}</TableCell>
                  <TableCell>{b.banco || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{b.agencia || '-'} / {b.conta || '-'}</TableCell>
                  <TableCell className="capitalize">{b.tipo}</TableCell>
                  <TableCell>R$ {Number(b.saldo_inicial).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={b.ativo ? 'default' : 'secondary'}>{b.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(b)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
