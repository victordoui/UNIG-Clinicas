import { Card, CardContent } from '@/components/ui/card';
import { RequirementStatusBadge, RequirementPriorityBadge, SLAChip } from './RequirementBadges';
import { FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RequirementListCard({ req }: { req: any }) {
  return (
    <Link to={`/requerimentos/${req.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{req.title}</h3>
              <RequirementStatusBadge status={req.status} />
              <RequirementPriorityBadge priority={req.priority} />
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              <span>{req.protocol_number}</span>
              {req.category?.name && <span>· {req.category.name}</span>}
              <span>· {new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
              <SLAChip dueDate={req.due_date} status={req.status} />
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
