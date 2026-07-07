import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Plus } from 'lucide-react';
import { ConversationList } from '@/components/comunicacao/ConversationList';
import { MessageThread } from '@/components/comunicacao/MessageThread';
import { NewMessageDialog } from '@/components/comunicacao/NewMessageDialog';

export default function Mensagens() {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [openNew, setOpenNew] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Mensagens</h1>
          </div>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova mensagem
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-[560px]">
            <div className="border-r overflow-hidden">
              <ConversationList
                selectedUserId={selected?.id}
                onSelect={(id, name) => setSelected({ id, name })}
              />
            </div>
            <div className="overflow-hidden">
              {selected ? (
                <MessageThread otherUserId={selected.id} otherName={selected.name} />
              ) : (
                <div className="h-full grid place-items-center text-sm text-muted-foreground p-6 text-center">
                  Selecione uma conversa ou inicie uma nova mensagem.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <NewMessageDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onSent={(id, name) => setSelected({ id, name })}
      />
    </MainLayout>
  );
}
