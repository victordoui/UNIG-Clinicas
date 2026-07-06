import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useRequirementDetail } from '@/hooks/useRequirements';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RequirementStatusBadge, RequirementPriorityBadge, SLAChip } from '@/components/requerimentos/RequirementBadges';
import { RequirementTimeline } from '@/components/requerimentos/RequirementTimeline';
import { RequirementCommentThread } from '@/components/requerimentos/RequirementCommentThread';
import { RequirementAttachmentList } from '@/components/requerimentos/RequirementAttachmentList';
import { RequirementActionPanel } from '@/components/requerimentos/RequirementActionPanel';
import { useAuth } from '@/hooks/useAuth';
import { isStaff } from '@/lib/unigRoles';
import { ArrowLeft, FileText } from 'lucide-react';

export default function RequerimentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data: req, isLoading } = useRequirementDetail(id);
  const { unigRole } = useAuth();
  const staff = isStaff(unigRole);

  if (isLoading) return <MainLayout><Skeleton className="h-96 w-full" /></MainLayout>;
  if (!req) return <MainLayout><p className="text-sm text-muted-foreground">Requerimento não encontrado.</p></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-4">
        <Link to={staff ? '/atendimento/requerimentos' : '/requerimentos'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Voltar
        </Link>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{req.protocol_number}</div>
                <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{req.title}</h1>
                {req.category?.name && <div className="text-sm text-muted-foreground mt-0.5">{req.category.name}{req.category.department ? ` · ${req.category.department}` : ''}</div>}
                {staff && req.student && (
                  <div className="text-xs text-muted-foreground mt-1">Aluno: <strong>{req.student.full_name}</strong> · {req.student.registration_number}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <RequirementStatusBadge status={req.status} />
                <RequirementPriorityBadge priority={req.priority} />
                <SLAChip dueDate={req.due_date} status={req.status} />
              </div>
            </div>
            {req.description && <p className="text-sm whitespace-pre-wrap pt-2 border-t">{req.description}</p>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <RequirementCommentThread requirementId={req.id} canInternal={staff} />
            <RequirementAttachmentList requirementId={req.id} />
          </div>
          <div className="space-y-4">
            <RequirementTimeline req={req} />
            {staff && <RequirementActionPanel req={req} />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
