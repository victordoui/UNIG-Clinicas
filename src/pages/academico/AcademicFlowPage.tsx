import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, DatabaseZap, Layers3 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCanReadAcademic } from '@/components/academico/StaffOnly';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface AcademicFlowPageProps { title: string; description: string; icon: LucideIcon; dependsOn: string; next: { label: string; to: string }; }

export default function AcademicFlowPage({ title, description, icon: Icon, dependsOn, next }: AcademicFlowPageProps) {
  const canRead = useCanReadAcademic();
  if (!canRead) return <MainLayout><p className="text-sm text-muted-foreground">Sem permissão para acessar este módulo.</p></MainLayout>;
  return <MainLayout><div className="space-y-5"><div className="space-y-1"><div className="flex items-center gap-2"><Icon className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">{title}</h1><Badge variant="secondary">Em implantação</Badge></div><p className="max-w-2xl text-sm text-muted-foreground">{description}</p></div><Card className="border-dashed"><CardHeader><div className="flex items-center gap-2 text-primary"><DatabaseZap className="h-5 w-5" /><CardTitle className="text-base">Fonte central de dados</CardTitle></div><CardDescription>Esta etapa será alimentada por grade, aulas, salas e bloqueios após a aplicação da migration acadêmica.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Layers3 className="h-4 w-4" />Depende de: {dependsOn}</div><Button asChild variant="outline"><Link to={next.to}>{next.label}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card></div></MainLayout>;
}
