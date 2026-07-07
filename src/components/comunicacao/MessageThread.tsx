import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversation, useSendMessage } from '@/hooks/useCommunication';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { formatRelativeTime } from '@/lib/communication';
import { cn } from '@/lib/utils';

interface Props {
  otherUserId: string;
  otherName: string;
}

export function MessageThread({ otherUserId, otherName }: Props) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useConversation(otherUserId);
  const send = useSendMessage();
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const submit = async () => {
    if (!body.trim()) return;
    await send.mutateAsync({ recipient_id: otherUserId, body: body.trim() });
    setBody('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3">
        <p className="font-semibold">{otherName}</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground text-center">Carregando…</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Envie a primeira mensagem.</p>
        )}
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                <p>{m.body}</p>
                <p className={cn('text-[10px] mt-1', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {formatRelativeTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Escreva uma mensagem…"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
        />
        <Button onClick={submit} disabled={send.isPending || !body.trim()} size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
