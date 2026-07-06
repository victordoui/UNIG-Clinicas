import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Edit, Trash2, Truck, Star, FileSignature, UserPlus } from 'lucide-react';
import { useSuppliers, useDeleteSupplier, type Supplier } from '@/hooks/useSuppliers';
import { SupplierFormModal } from '@/components/suppliers/SupplierFormModal';
import { SupplierContractsModal } from '@/components/suppliers/SupplierContractsModal';
import { useAuth } from '@/hooks/useAuth';
import { isStaff } from '@/lib/unigRoles';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Fornecedores() {
  const { unigRole } = useAuth();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const del = useDeleteSupplier();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [contractsFor, setContractsFor] = useState<Supplier | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const canManage = isStaff(unigRole);
  const canDelete = unigRole === 'administrador' || unigRole === 'coordenador_operacoes' || unigRole === 'gerente_geral' || unigRole === 'super_admin';

  const inviteAccess = async (s: Supplier) => {
    const email = window.prompt(`Email de acesso para ${s.nome_fantasia}:`, s.email || '');
    if (!email) return;
    const full_name = window.prompt('Nome do contato:', s.contato_nome || s.nome_fantasia) || s.nome_fantasia;
    const temporary_password = window.prompt('Senha temporária (mín. 8 chars):', 'Forn@123');
    if (!temporary_password) return;
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { toast({ title: 'Sessão expirada', variant: 'destructive' }); return; }
    const { error } = await supabase.functions.invoke('invite-supplier-user', {
      body: { supplier_id: s.id, email, full_name, temporary_password },
    });
    if (error) toast({ title: 'Erro ao conceder acesso', description: error.message, variant: 'destructive' });
    else toast({ title: 'Acesso concedido', description: `${email} pode entrar no portal.` });
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter(s =>
      [s.nome_fantasia, s.razao_social, s.cnpj, s.categoria, s.email]
        .some(v => v?.toLowerCase().includes(term))
    );
  }, [suppliers, search]);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Fornecedores</h1>
            <p className="text-muted-foreground">Cadastro central de fornecedores da organização</p>
          </div>
          {canManage && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Fornecedor
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, CNPJ, categoria…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-4"><TableSkeleton rows={5} columns={6} /></div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Truck}
                title={search ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
                description={search ? 'Ajuste a busca para ver mais resultados.' : 'Cadastre o primeiro fornecedor para começar.'}
                action={canManage && !search ? (
                  <Button onClick={() => { setEditing(null); setOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Novo Fornecedor
                  </Button>
                ) : null}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <div className="font-medium">{s.nome_fantasia}</div>
                        {s.razao_social && <div className="text-xs text-muted-foreground">{s.razao_social}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.cnpj || '—'}</TableCell>
                      <TableCell>{s.categoria || '—'}</TableCell>
                      <TableCell>
                        <div className="text-sm">{s.contato_nome || '—'}</div>
                        <div className="text-xs text-muted-foreground">{s.email || s.telefone || ''}</div>
                      </TableCell>
                      <TableCell>
                        {s.avaliacao ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm">{s.avaliacao}/5</span>
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.ativo ? 'default' : 'secondary'}>{s.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Conceder acesso ao portal" onClick={() => inviteAccess(s)}>
                            <UserPlus className="h-4 w-4 text-teal-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Contratos" onClick={() => setContractsFor(s)}>
                            <FileSignature className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => setToDelete(s)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <SupplierFormModal open={open} onOpenChange={setOpen} supplier={editing} />
      <SupplierContractsModal supplier={contractsFor} open={!!contractsFor} onOpenChange={(o) => !o && setContractsFor(null)} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{toDelete?.nome_fantasia}</strong> permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (toDelete) await del.mutateAsync(toDelete.id);
              setToDelete(null);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
