import { MainLayout } from '@/components/layout/MainLayout';
import { DocumentRequestList } from '@/components/aluno/DocumentRequestList';
import { useRequirementCategories, useStudentProfile, useStudentRequirements } from '@/hooks/useStudentData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { FileBadge, FileText, ScrollText } from 'lucide-react';

const DOC_CODES = ['matricula_declaracao', 'historico', 'frequencia', 'ementa', 'diploma'];

const statusMap: Record<string, { label: string; className: string }> = {
  open: { label: 'Aberto', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Em análise', className: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejeitado', className: 'bg-rose-100 text-rose-700' },
};

export default function AlunoDocumentos() {
  const qc = useQueryClient();
  const { data: student } = useStudentProfile();
  const { data: categories = [], isLoading: loadingCats } = useRequirementCategories();
  const { data: requirements = [] } = useStudentRequirements(student?.id);

  const docCategories = categories.filter((c: any) => DOC_CODES.includes(c.code));
  const myDocs = requirements.filter((r: any) => DOC_CODES.includes(r.category?.code ?? ''));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileBadge className="h-6 w-6 text-primary" />Documentos</h1>
          <p className="text-muted-foreground text-sm">Solicite documentos oficiais da instituição.</p>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Solicitar documento</h2>
          {loadingCats ? <Skeleton className="h-40 w-full" /> :
            <DocumentRequestList
              categories={docCategories}
              studentId={student?.id}
              onCreated={() => qc.invalidateQueries({ queryKey: ['student-requirements'] })}
            />
          }
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Meus pedidos</h2>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4" />Histórico</CardTitle></CardHeader>
            <CardContent>
              {myDocs.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum pedido registrado.</p>}
              <div className="divide-y">
                {myDocs.map((r: any) => {
                  const st = statusMap[r.status] ?? { label: r.status, className: 'bg-muted' };
                  return (
                    <div key={r.id} className="py-3 flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.protocol_number} · {new Date(r.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <Badge variant="outline" className={st.className}>{st.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
