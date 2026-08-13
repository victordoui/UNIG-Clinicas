import { useMemo, useState } from 'react';
import { Clock3, DoorOpen } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { useAcademicMeetings } from '@/hooks/useAcademicSchedules';
import { useRooms } from '@/hooks/useRooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const weekdays = [{ value: '1', label: 'Segunda-feira' }, { value: '2', label: 'Terça-feira' }, { value: '3', label: 'Quarta-feira' }, { value: '4', label: 'Quinta-feira' }, { value: '5', label: 'Sexta-feira' }, { value: '6', label: 'Sábado' }];
const toMinutes = (time: string) => { const [hours, minutes] = time.slice(0, 5).split(':').map(Number); return hours * 60 + minutes; };

export default function SalasLivres() {
  const canRead = useCanReadAcademic();
  const [weekday, setWeekday] = useState('1');
  const [time, setTime] = useState('07:10');
  const { data: rooms = [], isLoading: loadingRooms } = useRooms({ status: 'disponivel' });
  const { data: meetings = [], isLoading: loadingMeetings } = useAcademicMeetings();
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão.</p></MainLayout>;

  const busy = useMemo(() => new Set(meetings.filter((meeting) => meeting.weekday === Number(weekday) && meeting.room?.id && toMinutes(meeting.starts_at) <= toMinutes(time) && toMinutes(meeting.ends_at) > toMinutes(time)).map((meeting) => meeting.room?.id)), [meetings, time, weekday]);
  const free = rooms.filter((room: { id: string }) => !busy.has(room.id));
  const loading = loadingRooms || loadingMeetings;
  return <MainLayout><div className="space-y-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold"><DoorOpen className="h-6 w-6 text-primary" />Salas Livres</h1><p className="mt-1 text-sm text-muted-foreground">Consulte a disponibilidade para um dia e horário específicos da grade acadêmica.</p></div>
    <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2"><div className="space-y-2"><Label>Dia da semana</Label><Select value={weekday} onValueChange={setWeekday}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{weekdays.map((day) => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="room-time">Horário</Label><div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input id="room-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm ring-offset-background" /></div></div></CardContent></Card>
    <div className="grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Salas livres</p><p className="mt-2 text-3xl font-bold">{loading ? '—' : free.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs uppercase text-muted-foreground">Em uso neste horário</p><p className="mt-2 text-3xl font-bold">{loading ? '—' : busy.size}</p></CardContent></Card></div>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{free.map((room: { id: string; code: string; name: string; capacity: number; block?: string | null }) => <Card key={room.id}><CardHeader><CardTitle className="text-base">{room.code}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground"><p>{room.name}</p><p className="mt-1">Capacidade: {room.capacity}</p><p>{room.block ? `Bloco ${room.block}` : 'Bloco não informado'}</p></CardContent></Card>)}</div>
    {!loading && !free.length && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Não há salas livres para o filtro selecionado.</p>}
  </div></MainLayout>;
}
