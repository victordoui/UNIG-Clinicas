import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileBadge, FileText, Award, ScrollText, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const iconByCode: Record<string, any> = {
  matricula_declaracao: FileBadge,
  historico: ScrollText,
  frequencia: Clock,
  ementa: FileText,
  diploma: Award,
};

interface Props {
  categories: any[];
  studentId?: string;
  onCreated?: () => void;
}

export function DocumentRequestList({ categories, studentId, onCreated }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const request = async (cat: any) => {
    if (!studentId) {
      toast({ title: 'Perfil de aluno não encontrado', variant: 'destructive' });
      return;
    }
    setBusyId(cat.id);
    try {
      const protocol = 'REQ-' + Date.now().toString().slice(-8);
      const { error } = await supabase.from('student_requirements').insert({
        student_id: studentId,
        category_id: cat.id,
        title: `Solicitação de ${cat.name}`,
        status: 'open',
        priority: 'normal',
        protocol_number: protocol,
      });
      if (error) throw error;
      toast({ title: 'Requerimento aberto', description: `Protocolo ${protocol}` });
      onCreated?.();
    } catch (e: any) {
      toast({ title: 'Erro ao abrir requerimento', description: e.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {categories.map((cat) => {
        const Icon = iconByCode[cat.code] ?? FileText;
        return (
          <Card key={cat.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col gap-3 h-full">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm leading-tight">{cat.name}</h3>
                  <div className="flex gap-1 mt-1">
                    {cat.department && <Badge variant="outline" className="text-[10px]">{cat.department}</Badge>}
                    {cat.sla_days && <Badge variant="secondary" className="text-[10px]">SLA {cat.sla_days} dias</Badge>}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                className="mt-auto"
                onClick={() => request(cat)}
                disabled={busyId === cat.id}
              >
                {busyId === cat.id ? 'Enviando…' : 'Solicitar'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
