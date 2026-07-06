import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, IdCard, Mail, Phone, MapPin, BookOpen } from 'lucide-react';

interface Props {
  student: any;
}

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  locked: { label: 'Bloqueado', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  suspended: { label: 'Suspenso', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  graduated: { label: 'Formado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export function StudentIdentityCard({ student }: Props) {
  if (!student) return null;
  const s = statusMap[student.enrollment_status] ?? { label: student.enrollment_status, className: 'bg-muted text-foreground' };
  const initials = (student.full_name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Card>
      <CardContent className="p-5 flex flex-col md:flex-row gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
            {initials || '?'}
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-xl font-bold truncate">{student.full_name}</h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={s.className}>{s.label}</Badge>
              {student.course && <Badge variant="secondary"><GraduationCap className="h-3 w-3 mr-1" />{student.course.name}</Badge>}
              {student.admission_period && <Badge variant="outline">Ingresso {student.admission_period}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
              <IdCard className="h-3.5 w-3.5" /> Matrícula {student.registration}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:min-w-[320px] text-sm">
          {student.email && (
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{student.email}</span></div>
          )}
          {student.phone && (
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{student.phone}</div>
          )}
          {student.unit && (
            <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{student.unit.name}</div>
          )}
          {student.course?.degree_type && (
            <div className="flex items-center gap-2 text-muted-foreground"><BookOpen className="h-3.5 w-3.5" />{student.course.degree_type} · {student.course.modality}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
