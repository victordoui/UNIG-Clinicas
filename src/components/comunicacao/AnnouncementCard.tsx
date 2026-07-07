import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AudienceBadge } from './AudienceBadge';
import { formatRelativeTime } from '@/lib/communication';
import { Megaphone } from 'lucide-react';

interface Props {
  announcement: {
    id: string; title: string; body: string; audience: string; published_at: string;
  };
  actions?: React.ReactNode;
}

export function AnnouncementCard({ announcement, actions }: Props) {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{announcement.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(announcement.published_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AudienceBadge audience={announcement.audience} />
            {actions}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{announcement.body}</p>
      </CardContent>
    </Card>
  );
}
