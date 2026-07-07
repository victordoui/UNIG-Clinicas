import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useAnnouncements } from '@/hooks/useCommunication';
import { AnnouncementCard } from '@/components/comunicacao/AnnouncementCard';
import { audienceMatchesRole, type Audience } from '@/lib/communication';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone } from 'lucide-react';

export default function ComunicadosFeed() {
  const { unigRole } = useAuth();
  const [filter, setFilter] = useState<'todos' | Audience>('todos');
  const { data = [], isLoading } = useAnnouncements();
  const visible = data.filter((a: any) =>
    audienceMatchesRole(a.audience as Audience, unigRole) &&
    (filter === 'todos' || a.audience === filter)
  );

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Comunicados</h1>
          </div>
          <Select value={filter} onValueChange={v => setFilter(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="alunos">Alunos</SelectItem>
              <SelectItem value="docentes">Docentes</SelectItem>
              <SelectItem value="staff">Equipe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && visible.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhum comunicado disponível.</p>
        )}
        <div className="grid gap-3">
          {visible.map((a: any) => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>
      </div>
    </MainLayout>
  );
}
