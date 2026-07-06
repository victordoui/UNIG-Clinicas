import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentSearch, useRequirementsList } from '@/hooks/useRequirements';
import { RequirementListCard } from '@/components/requerimentos/RequirementListCard';
import { ScrollText, Search, User } from 'lucide-react';

export default function HistoricoAluno() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const { data: results = [], isLoading: searching } = useStudentSearch(query);
  const { data: reqs = [], isLoading: loadingReqs } = useRequirementsList({ scope: 'mine', studentId: selected?.id });

  return (
    <MainLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6 text-primary" />Histórico do aluno</h1>
          <p className="text-muted-foreground text-sm">Busque um aluno por nome, matrícula ou e-mail para ver todos os seus requerimentos.</p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Digite pelo menos 2 caracteres" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} className="pl-8" />
        </div>

        {!selected && query.length >= 2 && (
          <Card><CardContent className="p-0">
            {searching && <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
            {!searching && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum aluno encontrado.</p>}
            <div className="divide-y">
              {results.map((s: any) => (
                <button key={s.id} onClick={() => setSelected(s)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><User className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.registration} · {s.email}{s.course?.name ? ` · ${s.course.name}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent></Card>
        )}

        {selected && (
          <>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><User className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{selected.full_name}</div>
                <div className="text-xs text-muted-foreground">{selected.registration} · {selected.email}{selected.course?.name ? ` · ${selected.course.name}` : ''}</div>
              </div>
              <button className="text-xs text-primary hover:underline" onClick={() => setSelected(null)}>Trocar aluno</button>
            </CardContent></Card>

            {loadingReqs && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
            {!loadingReqs && reqs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Este aluno não possui requerimentos.</p>}
            <div className="space-y-2">
              {reqs.map((r: any) => <RequirementListCard key={r.id} req={r} />)}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
