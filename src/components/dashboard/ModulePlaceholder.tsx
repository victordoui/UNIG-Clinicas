import { Construction, LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ModulePlaceholderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function ModulePlaceholder({ title, description, icon: Icon = Construction }: ModulePlaceholderProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <Icon className="h-6 w-6 text-primary" />
          {title}
        </h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      <Card>
        <CardContent className="py-16 flex flex-col items-center text-center gap-3">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Módulo em construção</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Esta é a Fase 1 do UNIG-A. A estrutura desta tela ficará disponível
            nas próximas fases do sistema, junto com dados reais e ações completas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
