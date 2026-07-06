import { useState } from 'react';
import { useApprovalDelegations, useSaveDelegation, useDeleteDelegation, type ApprovalDelegation } from '@/hooks/useApprovalWorkflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, UserCog } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function useOrgMembers() {
  return useQuery({
    queryKey: ['org_members_simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members' as any)
        .select('user_id, profiles:user_id(full_name,email)')
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export default function ConfiguracaoDelegacoes() {
  const { data, isLoading } = useApprovalDelegations();
  const save = useSaveDelegation();
  const remove = useDeleteDelegation();
  const { user, currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const { data: members } = useOrgMembers();
  const [editing, setEditing] = useState<Partial<ApprovalDelegation> | null>(null);

  const openNew = () =>
    setEditing({
      origem_user_id: user?.id ?? '',
      destino_user_id: '',
      vigencia_inicio: new Date().toISOString().slice(0, 10),
      vigencia_fim: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      ativo: true,
    });

  const nameOf = (uid: string) => {
    const m = members?.find((x: any) => x.user_id === uid);
    return m?.profiles?.full_name || m?.profiles?.email || uid.slice(0, 8);
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            Delegações de Aprovação
          </h1>
          <p className="text-muted-foreground">Transfira temporariamente suas aprovações em períodos de ausência</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova delegação</Button>
      </div>
      {(() => {
        const recebidas = (data ?? []).filter((d) => d.destino_user_id === user?.id);
        if (!recebidas.length) return null;
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Delegações recebidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {recebidas.map((d) => {
                const ativa = d.ativo
                  && new Date() >= new Date(d.vigencia_inicio)
                  && new Date() <= new Date(d.vigencia_fim);
                return (
                  <div key={d.id} className="flex items-center justify-between flex-wrap gap-2">
                    <span>
                      <strong>{nameOf(d.origem_user_id)}</strong> delegou aprovações para você
                      <span className="text-muted-foreground"> · {format(new Date(d.vigencia_inicio), 'dd/MM/yyyy', { locale: ptBR })} a {format(new Date(d.vigencia_fim), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </span>
                    <Badge variant={ativa ? 'default' : 'outline'}>{ativa ? 'Ativa' : 'Inativa'}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}


      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : !data?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma delegação cadastrada</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((d) => {
            const ativa = d.ativo
              && new Date() >= new Date(d.vigencia_inicio)
              && new Date() <= new Date(d.vigencia_fim);
            return (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">
                      {nameOf(d.origem_user_id)} → {nameOf(d.destino_user_id)}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={ativa ? 'default' : 'outline'}>{ativa ? 'Ativa' : 'Inativa'}</Badge>
                      {(isAdmin || d.origem_user_id === user?.id) && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditing(d)}>Editar</Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm('Remover delegação?')) remove.mutate(d.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Vigência: {format(new Date(d.vigencia_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                  {' até '}{format(new Date(d.vigencia_fim), 'dd/MM/yyyy', { locale: ptBR })}
                  {d.motivo && <p className="mt-1 italic">"{d.motivo}"</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? 'Editar delegação' : 'Nova delegação'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>De (origem)</Label>
                {isAdmin ? (
                  <Select value={editing.origem_user_id} onValueChange={(v) => setEditing({ ...editing, origem_user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {members?.map((m: any) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profiles?.full_name || m.profiles?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={nameOf(editing.origem_user_id ?? '')} disabled />
                )}
              </div>
              <div>
                <Label>Para (destino)</Label>
                <Select value={editing.destino_user_id} onValueChange={(v) => setEditing({ ...editing, destino_user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {members?.filter((m: any) => m.user_id !== editing.origem_user_id).map((m: any) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.profiles?.full_name || m.profiles?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input type="date" value={editing.vigencia_inicio} onChange={(e) => setEditing({ ...editing, vigencia_inicio: e.target.value })} />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input type="date" value={editing.vigencia_fim} onChange={(e) => setEditing({ ...editing, vigencia_fim: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Motivo</Label>
                <Textarea value={editing.motivo ?? ''} onChange={(e) => setEditing({ ...editing, motivo: e.target.value })} placeholder="Ex.: Férias, viagem a trabalho" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label>Ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  await save.mutateAsync(editing);
                  setEditing(null);
                }}
                disabled={save.isPending || !editing.origem_user_id || !editing.destino_user_id}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
