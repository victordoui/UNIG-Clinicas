import { Bell, CalendarDays, CheckCircle2, Info, Megaphone, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

const NOTICES = [
  {
    icon: Megaphone,
    title: 'Centralização das solicitações por CI',
    date: '09/06/2026',
    category: 'Processo',
    priority: 'Importante',
    tone: 'blue',
    body: 'Todas as compras internas devem ser registradas pelo portal para garantir protocolo, rastreabilidade e acompanhamento pela equipe responsável.',
  },
  {
    icon: CheckCircle2,
    title: 'Atualize seus dados antes de abrir uma requisição',
    date: '09/06/2026',
    category: 'Cadastro',
    priority: 'Atenção',
    tone: 'emerald',
    body: 'Confira nome, matrícula, WhatsApp, setor/departamento e cargo em Meu Perfil. Essas informações são usadas automaticamente no formulário.',
  },
  {
    icon: Wrench,
    title: 'Detalhamento técnico reduz ajustes',
    date: '09/06/2026',
    category: 'Orientação',
    priority: 'Dica',
    tone: 'amber',
    body: 'Inclua especificações, links, imagens e referências sempre que possível. Quanto mais claro o pedido, mais rápida tende a ser a triagem.',
  },
];

export default function CIPublicAvisos() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" /> Avisos
        </h1>
        <p className="text-sm text-slate-500">Comunicados e alertas do time de Facilities para solicitantes.</p>
      </div>

      <Card className="rounded-2xl border-blue-200/60 bg-blue-50/40 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Fique atento às orientações do portal</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Os avisos abaixo ajudam a manter suas solicitações padronizadas e com menos necessidade de correção.
            </p>
          </div>
        </div>
      </Card>

      {NOTICES.length === 0 ? (
        <Card className="rounded-2xl border-slate-200/80 shadow-sm p-8">
          <EmptyState
            icon={Bell}
            title="Nenhum aviso no momento"
            description="Quando o time de Facilities publicar comunicados, eles aparecerão aqui."
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {NOTICES.map((notice) => (
            <NoticeCard key={notice.title} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoticeCard({ notice }: { notice: typeof NOTICES[number] }) {
  const Icon = notice.icon;
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  } as const;

  return (
    <Card className="rounded-2xl border-slate-200/80 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className={cn('h-11 w-11 rounded-xl border flex items-center justify-center shrink-0', tones[notice.tone as keyof typeof tones])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className={cn('border', tones[notice.tone as keyof typeof tones])}>
              {notice.category}
            </Badge>
            <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
              {notice.priority}
            </Badge>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <CalendarDays className="h-3 w-3" /> {notice.date}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900">{notice.title}</h2>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">{notice.body}</p>
        </div>
      </div>
    </Card>
  );
}
