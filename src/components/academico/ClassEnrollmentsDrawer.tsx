import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClassEnrollments, useStudents, useEnrollStudent, useUnenrollStudent } from '@/hooks/useAcademicData';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { toast } from '@/hooks/use-toast';
import { Search, UserPlus, Users } from 'lucide-react';

export function ClassEnrollmentsDrawer({ classId, className, trigger }: { classId: string; className: string; trigger: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: enrollments = [] } = useClassEnrollments(classId);
  const { data: candidates = [] } = useStudents({ search });
  const enroll = useEnrollStudent();
  const unenroll = useUnenrollStudent();

  const enrolledIds = new Set(enrollments.map((e: any) => e.student?.id));
  const filteredCandidates = candidates.filter((s: any) => !enrolledIds.has(s.id));

  const add = async (studentId: string) => {
    try { await enroll.mutateAsync({ studentId, classId }); toast({ title: 'Aluno matriculado' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };
  const remove = async (enrollmentId: string) => {
    try { await unenroll.mutateAsync({ enrollmentId, classId }); toast({ title: 'Matrícula removida' }); }
    catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Matrículas — {className}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Alunos matriculados ({enrollments.length})</h3>
            {enrollments.length === 0 && <p className="text-xs text-muted-foreground py-3">Nenhum aluno matriculado.</p>}
            <div className="divide-y border rounded-md">
              {enrollments.map((e: any) => (
                <div key={e.id} className="flex items-center gap-2 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{e.student?.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{e.student?.registration} · {e.student?.email}</div>
                  </div>
                  <ConfirmDeleteDialog title="Remover matrícula" description={`Remover ${e.student?.full_name} da turma?`} onConfirm={() => remove(e.id)} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Adicionar aluno</h3>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome/matrícula" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <div className="mt-2 divide-y border rounded-md max-h-72 overflow-y-auto">
              {search.length < 2 && <p className="text-xs text-muted-foreground p-3">Digite ao menos 2 caracteres.</p>}
              {search.length >= 2 && filteredCandidates.length === 0 && <p className="text-xs text-muted-foreground p-3">Nenhum aluno disponível.</p>}
              {filteredCandidates.slice(0, 20).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.registration}</div>
                  </div>
                  <Button size="sm" onClick={() => add(s.id)} disabled={enroll.isPending}><UserPlus className="h-4 w-4 mr-1" />Matricular</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
