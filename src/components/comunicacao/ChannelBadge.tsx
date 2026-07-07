import { Badge } from '@/components/ui/badge';
import { CHANNEL_LABEL, STATUS_BADGE, STATUS_LABEL, type CommChannel, type CommStatus } from '@/lib/communication';
import { cn } from '@/lib/utils';

export function ChannelBadge({ channel }: { channel: CommChannel | string }) {
  const c = (channel as CommChannel) in CHANNEL_LABEL ? (channel as CommChannel) : 'sistema';
  return <Badge variant="secondary">{CHANNEL_LABEL[c]}</Badge>;
}

export function StatusBadge({ status }: { status: CommStatus | string }) {
  const s = (status as CommStatus) in STATUS_BADGE ? (status as CommStatus) : 'rascunho';
  return <Badge variant="outline" className={cn(STATUS_BADGE[s])}>{STATUS_LABEL[s]}</Badge>;
}
