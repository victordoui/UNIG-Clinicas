import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Save, X, FileSignature, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { isStaff } from '@/lib/unigRoles';
import {
  useSupplierContracts, useUpsertContract, useDeleteContract,
  useContractItems, useUpsertContractItem, useDeleteContractItem,
  type SupplierContract, type ContractItem,
} from '@/hooks/useSupplierContracts';
import { formatBRL } from '@/lib/purchaseLabels';
import type { Supplier } from '@/hooks/useSuppliers';

interface Props {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SupplierContractsModal({ supplier, open, onOpenChange }: Props) {
  const { unigRole } = useAuth();
  const { toast } = useToast();
  const canManage = isStaff(unigRole);
  const { data: contracts = [] } = useSupplierContracts(supplier?.id);
  const upsert = useUpsertContract();
  const del = useDeleteContract();

  const [editing, setEditing] = useState<Partial<SupplierContract> | null>(null);
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const openContract = contracts.find(c => c.id === openContractId);

  const startNew = () => {
    if (!supplier) return;
    const today = new Date().toISOString().slice(0, 10);
    const oneYear = new Date(); oneYear.setFullYear(oneYear.getFullYear() + 1);
    setEditing({
      supplier_id: supplier.id, numero: '', inicio: today, fim: oneYear.toISOString().slice(0, 10),
      condicao_pagamento: '', desconto_percent: 0, status: 'ativo', observacoes: '',
      auto_renovacao: false, dias_aviso_vencimento: 30, valor_mensal: null, categoria: '',
    });
  };

  const save = async () => {
    if (!editing?.numero?.trim() || !editing?.inicio || !editing?.fim) {
      return toast({ title: 'Preencha número e vigência', variant: 'destructive' });
    }
    await upsert.mutateAsync(editing);
    setEditing(null);
  };

  if (openContract) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setOpenContractId(null)}><ChevronLeft className="h-4 w-4" /></Button>
              Itens do contrato {openContract.numero}
            </DialogTitle>
          </DialogHeader>
          <ContractItemsPanel contract={openContract} canManage={canManage} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> Contratos — {supplier?.nome_fantasia}
          </DialogTitle>
        </DialogHeader>

        {canManage && !editing && (
          <div className="flex justify-end">
            <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-2" />Novo contrato</Button>
          </div>
        )}

        {editing && (
          <Card>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6">
              <div>
                <label className="text-xs text-muted-foreground">Número *</label>
                <Input value={editing.numero ?? ''} onChange={e => setEditing({ ...editing, numero: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={editing.status ?? 'ativo'} onValueChange={(v: any) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="em_renovacao">Em renovação</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Desconto (%)</label>
                <Input type="number" min={0} max={100} step="0.01" value={editing.desconto_percent ?? 0} onChange={e => setEditing({ ...editing, desconto_percent: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Início *</label>
                <Input type="date" value={editing.inicio ?? ''} onChange={e => setEditing({ ...editing, inicio: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fim *</label>
                <Input type="date" value={editing.fim ?? ''} onChange={e => setEditing({ ...editing, fim: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Condição de pagamento</label>
                <Input value={editing.condicao_pagamento ?? ''} onChange={e => setEditing({ ...editing, condicao_pagamento: e.target.value })} placeholder="30/60/90" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Valor mensal (R$)</label>
                <Input type="number" step="0.01" value={editing.valor_mensal ?? ''} onChange={e => setEditing({ ...editing, valor_mensal: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoria</label>
                <Input value={editing.categoria ?? ''} onChange={e => setEditing({ ...editing, categoria: e.target.value })} placeholder="Ex.: TI, Limpeza" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Aviso vencimento (dias)</label>
                <Input type="number" min={1} value={editing.dias_aviso_vencimento ?? 30} onChange={e => setEditing({ ...editing, dias_aviso_vencimento: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!editing.auto_renovacao} onChange={e => setEditing({ ...editing, auto_renovacao: e.target.checked })} />
                  Renovação automática
                </label>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs text-muted-foreground">Observações</label>
                <Textarea rows={2} value={editing.observacoes ?? ''} onChange={e => setEditing({ ...editing, observacoes: e.target.value })} />
              </div>
              <div className="md:col-span-3 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-2" />Cancelar</Button>
                <Button onClick={save} disabled={upsert.isPending}><Save className="h-4 w-4 mr-2" />Salvar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {contracts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">Nenhum contrato cadastrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenContractId(c.id)}>
                  <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                  <TableCell className="text-xs">{c.inicio} → {c.fim}</TableCell>
                  <TableCell>{c.desconto_percent ?? 0}%</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'ativo' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    {canManage && <Button variant="ghost" size="icon" onClick={() => setEditing(c)}><Edit2 className="h-4 w-4" /></Button>}
                    {canManage && <Button variant="ghost" size="icon" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContractItemsPanel({ contract, canManage }: { contract: SupplierContract; canManage: boolean }) {
  const { toast } = useToast();
  const { data: items = [] } = useContractItems(contract.id);
  const upsert = useUpsertContractItem();
  const del = useDeleteContractItem();
  const [editing, setEditing] = useState<Partial<ContractItem> | null>(null);

  const startNew = () => setEditing({ contract_id: contract.id, descricao: '', preco_unitario: 0, quantidade_minima: 1 });

  const save = async () => {
    if (!editing?.descricao?.trim() || !editing?.preco_unitario) {
      return toast({ title: 'Descrição e preço são obrigatórios', variant: 'destructive' });
    }
    await upsert.mutateAsync(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {canManage && !editing && (
        <div className="flex justify-end">
          <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-2" />Novo item</Button>
        </div>
      )}
      {editing && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/30">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Descrição/Produto *</label>
            <Input value={editing.descricao ?? ''} onChange={e => setEditing({ ...editing, descricao: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Preço unitário *</label>
            <Input type="number" step="0.01" value={editing.preco_unitario ?? ''} onChange={e => setEditing({ ...editing, preco_unitario: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Qtd. mínima</label>
            <Input type="number" step="0.01" value={editing.quantidade_minima ?? 1} onChange={e => setEditing({ ...editing, quantidade_minima: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Prazo entrega (dias)</label>
            <Input type="number" value={editing.prazo_entrega_dias ?? ''} onChange={e => setEditing({ ...editing, prazo_entrega_dias: e.target.value === '' ? null : Number(e.target.value) })} />
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4 mr-2" />Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending}><Save className="h-4 w-4 mr-2" />Salvar</Button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">Nenhum item neste contrato.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Qtd. mín.</TableHead>
              <TableHead>Prazo</TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(it => (
              <TableRow key={it.id}>
                <TableCell>{it.descricao ?? '—'}</TableCell>
                <TableCell>{formatBRL(it.preco_unitario)}</TableCell>
                <TableCell>{it.quantidade_minima ?? '—'}</TableCell>
                <TableCell>{it.prazo_entrega_dias != null ? `${it.prazo_entrega_dias} d` : '—'}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(it)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate({ id: it.id, contract_id: contract.id })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
