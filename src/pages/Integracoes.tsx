import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useIntegrationWebhooks, useIntegrationLogs, useSaveWebhook, useDeleteWebhook, WEBHOOK_EVENTS, IntegrationWebhook } from '@/hooks/useIntegrationWebhooks';
import { EmptyState } from '@/components/ui/empty-state';
import { Webhook, Plus, Trash2, Pencil } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';

export default function Integracoes() {
  const { data: webhooks = [] } = useIntegrationWebhooks();
  const { data: logs = [] } = useIntegrationLogs();
  const save = useSaveWebhook();
  const del = useDeleteWebhook();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<IntegrationWebhook> | null>(null);

  const startNew = () => {
    setEditing({ nome: '', url: '', evento: 'pedido.emitido', ativo: true, secret: '', headers: {} });
    setOpen(true);
  };
  const startEdit = (w: IntegrationWebhook) => {
    setEditing(w);
    setOpen(true);
  };

  const submit = async () => {
    if (!editing?.nome || !editing.url || !editing.evento) return;
    await save.mutateAsync(editing);
    setOpen(false);
    setEditing(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Webhook className="h-6 w-6 text-primary" /> Integrações</h1>
            <p className="text-muted-foreground mt-1">Webhooks de saída para sistemas externos</p>
          </div>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4 mr-2" /> Novo webhook
          </Button>
        </div>

        <Tabs defaultValue="webhooks">
          <TabsList>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="logs">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="mt-4">
            {webhooks.length === 0 ? (
              <EmptyState
                icon={Webhook}
                title="Nenhum webhook configurado"
                description="Crie webhooks para notificar sistemas externos sobre eventos de compra."
              />
            ) : (
              <div className="grid gap-4">
                {webhooks.map((w) => (
                  <Card key={w.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Webhook className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">{w.nome}</CardTitle>
                          <Badge variant={w.ativo ? 'default' : 'secondary'}>{w.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(w)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => del.mutate(w.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Evento:</span> <Badge variant="outline">{w.evento}</Badge></p>
                      <p className="truncate"><span className="text-muted-foreground">URL:</span> {w.url}</p>
                      {w.ultima_chamada && (
                        <p className="text-xs text-muted-foreground">Última chamada: {new Date(w.ultima_chamada).toLocaleString('pt-BR')} ({w.ultimo_status})</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            {logs.length === 0 ? (
              <EmptyState icon={Webhook} title="Sem registros" description="Os logs aparecerão aqui após o disparo dos eventos." />
            ) : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <Card key={l.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{l.evento}</p>
                        <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <Badge variant={l.status_http && l.status_http < 400 ? 'default' : 'secondary'}>
                        {l.status_http ?? 'pendente'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar webhook' : 'Novo webhook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editing?.nome ?? ''} onChange={(e) => setEditing({ ...editing!, nome: e.target.value })} />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={editing?.url ?? ''} onChange={(e) => setEditing({ ...editing!, url: e.target.value })} placeholder="https://exemplo.com/webhook" />
            </div>
            <div>
              <Label>Evento</Label>
              <Select value={editing?.evento} onValueChange={(v) => setEditing({ ...editing!, evento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Secret (opcional)</Label>
              <Input value={editing?.secret ?? ''} onChange={(e) => setEditing({ ...editing!, secret: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing!, ativo: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <LoadingButton loading={save.isPending} onClick={submit}>Salvar</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
