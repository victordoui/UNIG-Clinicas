import { useMemo, useState } from 'react';
import { CalendarDays, Printer, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { useClasses } from '@/hooks/useAcademicData';
import { formatSchedule } from '@/lib/academic';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type ScheduleSlot = { day: number; start: string; end: string };
type ExistingClass = {
  id: string;
  code: string;
  name: string;
  academic_period: string;
  shift: string;
  room: string | null;
  schedule: ScheduleSlot[];
  subject?: { name: string } | null;
  professor?: { full_name: string } | null;
};

function hasSchedule(value: unknown): value is ExistingClass {
  return typeof value === 'object'
    && value !== null
    && Array.isArray((value as { schedule?: unknown }).schedule)
    && (value as { schedule: unknown[] }).schedule.length > 0;
}

export default function Aulas() {
  const canRead = useCanReadAcademic();
  const [search, setSearch] = useState('');
  const { data: classes = [], isLoading, error } = useClasses({ search });
  const scheduled = useMemo(
    () => (classes as unknown[]).filter(hasSchedule),
    [classes],
  );
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;
  return <MainLayout><div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3 print:hidden"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-primary" />Grade de Aulas</h1><p className="text-sm text-muted-foreground">Consulta das turmas e horários cadastrados no sistema.</p></div><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button></div><div className="relative max-w-md print:hidden"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar turma, disciplina ou código" /></div><Card><CardContent className="p-0">{isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div> : error ? <p className="p-6 text-sm text-destructive">Não foi possível carregar as turmas. Verifique as permissões de acesso.</p> : scheduled.length === 0 ? <div className="p-8 text-center"><p className="font-medium">Nenhuma grade cadastrada</p><p className="mt-1 text-sm text-muted-foreground">Cadastre os horários nas turmas existentes. A publicação e o ensalamento serão habilitados pelo modelo central de grade.</p></div> : <div className="divide-y">{scheduled.map((row) => <article key={row.id} className="space-y-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{row.subject?.name ?? row.name}</p><p className="text-xs text-muted-foreground">{row.code} · {row.academic_period} · {row.professor?.full_name ?? 'Professor não informado'}</p></div><div className="flex gap-2"><Badge variant="secondary">{row.shift}</Badge>{row.room && <Badge variant="outline">{row.room}</Badge>}</div></div><p className="text-sm text-muted-foreground">{formatSchedule(row.schedule)}</p></article>)}</div>}</CardContent></Card></div></MainLayout>;
}
