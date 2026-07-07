import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMyMessages, type DirectMessageRow } from '@/hooks/useCommunication';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/communication';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Conversation {
  otherId: string;
  lastMessage: DirectMessageRow;
  unreadCount: number;
}

export function ConversationList({
  selectedUserId,
  onSelect,
}: {
  selectedUserId?: string;
  onSelect: (userId: string, name: string) => void;
}) {
  const { user } = useAuth();
  const { data: messages = [] } = useMyMessages();

  const conversations = useMemo<Conversation[]>(() => {
    if (!user?.id) return [];
    const map = new Map<string, Conversation>();
    for (const m of messages) {
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const existing = map.get(otherId);
      const unread = m.recipient_id === user.id && !m.read_at ? 1 : 0;
      if (!existing) {
        map.set(otherId, { otherId, lastMessage: m, unreadCount: unread });
      } else {
        existing.unreadCount += unread;
      }
    }
    return Array.from(map.values());
  }, [messages, user?.id]);

  const otherIds = conversations.map(c => c.otherId);
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-conv', otherIds],
    enabled: otherIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('id', otherIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameOf = (id: string) => {
    const p = profiles.find((x: any) => x.id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  if (conversations.length === 0) {
    return <p className="text-sm text-muted-foreground text-center p-6">Nenhuma conversa ainda.</p>;
  }

  return (
    <ScrollArea className="h-full">
      <ul className="divide-y">
        {conversations.map(c => (
          <li key={c.otherId}>
            <button
              onClick={() => onSelect(c.otherId, nameOf(c.otherId))}
              className={cn(
                'w-full text-left px-3 py-3 hover:bg-muted/50 flex items-start gap-2',
                selectedUserId === c.otherId && 'bg-muted',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate text-sm">{nameOf(c.otherId)}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(c.lastMessage.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessage.body}</p>
              </div>
              {c.unreadCount > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] grid place-items-center">
                  {c.unreadCount}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
