import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CouncilVote, CouncilMember } from '@/hooks/useCouncil';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  votes: CouncilVote[];
  members: CouncilMember[];
  totalMembros: number;
}

function formatWhen(d: string) {
  const date = new Date(d);
  if (isToday(date)) return `hoje, ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `ontem, ${format(date, 'HH:mm')}`;
  return format(date, "d MMM", { locale: ptBR });
}

function initials(name: string | null | undefined, fallback: string) {
  const n = (name ?? '').trim();
  if (!n) return fallback;
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || fallback;
}

const VOTE_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  aprovado: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Aprovado' },
  rejeitado: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'Reprovado' },
  abstencao: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Absteve-se' },
};

export function CouncilVoteTimeline({ votes, members, totalMembros }: Props) {
  const memberVotes = members.map((m, i) => ({
    member: m,
    index: i,
    vote: votes.find(v => v.membro_user_id === m.user_id),
  }));

  const emptySlots = Math.max(0, totalMembros - members.length);

  const sorted = [...memberVotes].sort((a, b) => {
    if (a.vote && !b.vote) return -1;
    if (!a.vote && b.vote) return 1;
    if (a.vote && b.vote) return new Date(a.vote.votado_em).getTime() - new Date(b.vote.votado_em).getTime();
    return 0;
  });

  const totalItems = sorted.length + emptySlots;

  return (
    <ol className="relative">
      {/* vertical line */}
      <span
        aria-hidden
        className="absolute left-[5px] top-2 bottom-2 w-px bg-border"
      />

      {sorted.map(({ member, index, vote }, i) => {
        const style = vote ? VOTE_STYLES[vote.voto] : null;
        const name = member.nome_exibicao?.trim() || `Conselheiro ${index + 1}`;
        const isLast = i === totalItems - 1;
        return (
          <li key={member.id} className={cn('relative flex gap-3', !isLast && 'pb-5')}>
            <span
              className={cn(
                'relative z-10 mt-2 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-background',
                style ? style.dot : 'bg-muted-foreground/40',
              )}
            />
            <div className="flex flex-1 gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0">
                {member.foto_url && <AvatarImage src={member.foto_url} alt={name} />}
                <AvatarFallback className="text-[11px]">{initials(name, `M${index + 1}`)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium">{name}</span>
                  {style && vote && (
                    <span className={cn('ml-1', style.text)}>
                      ({style.label}, {formatWhen(vote.votado_em)})
                    </span>
                  )}
                  {!vote && (
                    <span className="ml-1 text-muted-foreground italic">(aguardando voto)</span>
                  )}
                </p>
                {vote?.comentario && (
                  <p className="mt-0.5 text-sm text-muted-foreground italic truncate">
                    "{vote.comentario}"
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}

      {Array.from({ length: emptySlots }).map((_, i) => {
        const isLast = sorted.length + i === totalItems - 1;
        return (
          <li key={`empty-${i}`} className={cn('relative flex gap-3', !isLast && 'pb-5')}>
            <span className="relative z-10 mt-2 h-[11px] w-[11px] shrink-0 rounded-full ring-2 ring-background bg-muted-foreground/30" />
            <div className="flex flex-1 gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0 opacity-50">
                <AvatarFallback className="text-[11px]">?</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground italic self-center">
                Aguardando voto do conselheiro {members.length + i + 1}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
