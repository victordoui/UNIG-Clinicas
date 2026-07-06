import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, User, Clock, MapPin, Sun, Moon, Sunrise } from 'lucide-react';

const shiftIcon: Record<string, any> = { Manha: Sunrise, Tarde: Sun, Noite: Moon };

interface Props { enrollment: any; }

export function EnrolledClassCard({ enrollment }: Props) {
  const c = enrollment.class;
  if (!c) return null;
  const Icon = shiftIcon[c.shift] ?? Clock;
  const schedule = Array.isArray(c.schedule) ? c.schedule : [];
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{c.code}</span>
              <Badge variant="outline" className="text-[10px]"><Icon className="h-3 w-3 mr-1" />{c.shift}</Badge>
            </div>
            <h3 className="font-semibold text-sm leading-tight">{c.subject?.name ?? c.name}</h3>
            {c.subject && <p className="text-xs text-muted-foreground mt-0.5">{c.subject.workload_hours}h · {c.subject.semester}º semestre</p>}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-2">
          {c.professor && (
            <div className="flex items-center gap-1.5"><User className="h-3 w-3" />{c.professor.full_name}</div>
          )}
          {c.room && (
            <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{c.room}</div>
          )}
          {schedule.length > 0 && (
            <div className="flex items-start gap-1.5"><Clock className="h-3 w-3 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {schedule.map((s: any, i: number) => (
                  <span key={i} className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">
                    {days[s.day]} {s.start}–{s.end}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5"><BookOpen className="h-3 w-3" />{c.academic_period}</div>
        </div>
      </CardContent>
    </Card>
  );
}
