import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, Send } from 'lucide-react';
import {
  useAnnouncements, useDeleteAnnouncement, useBroadcastAnnouncement,
  useCommunications,
} from '@/hooks/useCommunication';
import { AnnouncementCard } from '@/components/comunicacao/AnnouncementCard';
import { AnnouncementFormDialog } from '@/components/comunicacao/AnnouncementFormDialog';
import { CommunicationFormDialog } from '@/components/comunicacao/CommunicationFormDialog';
import { CommunicationListTable } from '@/components/comunicacao/CommunicationListTable';
import { ConfirmDeleteDialog } from '@/components/academico/ConfirmDeleteDialog';
import { canWriteAnnouncement, canWriteCommunication } from '@/lib/communication';
import { toast } from '@/hooks/use-toast';

export default function ComunicacaoGestao() {
  const { unigRole } = useAuth();
  const canA = canWriteAnnouncement(unigRole);
  const canC = canWriteCommunication(unigRole);

  const { data: announcements = [] } = useAnnouncements();
  const { data: communications = [] } = useCommunications();
  const del = useDeleteAnnouncement();
  const broadcast = useBroadcastAnnouncement();

  const [openA, setOpenA] = useState(false);
  const [openC, setOpenC] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Comunicados</h1>
            <p className="text-sm text-muted-foreground">Publique comunicados e envie mensagens direcionadas.</p>
          </div>
        </div>

        <Tabs defaultValue="announcements">
          <TabsList>
            <TabsTrigger value="announcements">Comunicados institucionais</TabsTrigger>
            <TabsTrigger value="targeted">Comunicados direcionados</TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="space-y-3">
            {canA && (
              <div className="flex justify-end">
                <Button onClick={() => { setEditing(null); setOpenA(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Novo comunicado
                </Button>
              </div>
            )}
            {announcements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum comunicado publicado.</p>
            )}
            <div className="grid gap-3">
              {announcements.map((a: any) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  actions={canA && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={async () => {
                          try {
                            const n = await broadcast.mutateAsync(a.id);
                            toast({ title: `Notificação enviada para ${n} usuário(s)` });
                          } catch (e: any) {
                            toast({ title: 'Erro', description: e.message, variant: 'destructive' });
                          }
                        }}
                        title="Notificar destinatários"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setOpenA(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDel(a)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="targeted" className="space-y-3">
            {canC && (
              <div className="flex justify-end">
                <Button onClick={() => setOpenC(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Novo direcionado
                </Button>
              </div>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
              <CardContent><CommunicationListTable rows={communications} /></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AnnouncementFormDialog open={openA} onOpenChange={setOpenA} initial={editing} />
      <CommunicationFormDialog open={openC} onOpenChange={setOpenC} />
      <ConfirmDeleteDialog
        open={!!confirmDel}
        onOpenChange={(v) => { if (!v) setConfirmDel(null); }}
        title="Excluir comunicado?"
        description={confirmDel?.title}
        onConfirm={async () => {
          if (!confirmDel) return;
          await del.mutateAsync(confirmDel.id);
          toast({ title: 'Comunicado excluído' });
          setConfirmDel(null);
        }}
      />
    </MainLayout>
  );
}
