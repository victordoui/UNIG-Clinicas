import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCIList } from '@/hooks/useCI';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CIStatusBadge } from '@/components/ci/CIStatusBadge';
import { CI_PRIORITY_BADGE, CI_PRIORITY_LABEL } from '@/lib/ciLabels';
import { ClipboardCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TECH_STATUSES = ['aguardando_validacao_tecnica', 'ajuste_solicitado_engenheira'];
const REG_STATUSES = ['aguardando_validacao_regulatoria', 'ajuste_solicitado_regulatorio'];

function CIList({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma CI aguardando validação</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-2">
      {items.map((c: any) => (
        <Link key={c.id} to={`/dashboard/ci/${c.id}`}>
          <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline">CI</Badge>
                  <span className="font-mono text-xs text-primary">{c.protocol}</span>
                  <CIStatusBadge status={c.status} />
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${CI_PRIORITY_BADGE[c.priority as keyof typeof CI_PRIORITY_BADGE]}`}>
                    {CI_PRIORITY_LABEL[c.priority as keyof typeof CI_PRIORITY_LABEL]}
                  </span>
                </div>
                <div className="text-sm font-medium truncate">{c.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {c.requester_name} · {c.source_sector ?? '—'} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function CIValidacao() {
  const { unigRole, isSuperAdmin } = useAuth();
  const { data, isLoading } = useCIList();
  const list = data ?? [];

  const techItems = list.filter((c: any) => TECH_STATUSES.includes(c.status));
  const regItems = list.filter((c: any) => REG_STATUSES.includes(c.status));

  const isEngenheira = unigRole === 'engenheira';
  const isRegulatorio = unigRole === 'validador_regulatorio';
  const isAdmin = isSuperAdmin || unigRole === 'administrador' || unigRole === 'coordenador_operacoes' || unigRole === 'gerente_geral';

  const showTech = isAdmin || isEngenheira;
  const showReg = isAdmin || isRegulatorio;
  const showBoth = showTech && showReg;

  const [tab, setTab] = useState<'tecnica' | 'regulatoria'>(showTech ? 'tecnica' : 'regulatoria');

  return (
    <MainLayout>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Validações
          </h1>
          <p className="text-muted-foreground">
            {isRegulatorio && !isAdmin
              ? 'Requisições de Compra aguardando validação regulatória (PF/Receita).'
              : isEngenheira && !isAdmin
              ? 'Requisições de Compra aguardando o parecer da Engenheira.'
              : 'Requisições aguardando validação técnica ou regulatória.'}
          </p>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
        ) : showBoth ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="tecnica">Técnica ({techItems.length})</TabsTrigger>
              <TabsTrigger value="regulatoria">Regulatória ({regItems.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="tecnica" className="mt-4">
              <CIList items={techItems} />
            </TabsContent>
            <TabsContent value="regulatoria" className="mt-4">
              <CIList items={regItems} />
            </TabsContent>
          </Tabs>
        ) : showTech ? (
          <CIList items={techItems} />
        ) : showReg ? (
          <CIList items={regItems} />
        ) : null}
      </div>
    </MainLayout>
  );
}
