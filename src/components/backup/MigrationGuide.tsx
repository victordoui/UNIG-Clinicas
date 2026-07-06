import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Info
} from "lucide-react";

interface MigrationGuideProps {
  onCreateBackup: () => void;
  isLoading: boolean;
}

export function MigrationGuide({ onCreateBackup, isLoading }: MigrationGuideProps) {
  const steps = [
    {
      id: 1,
      title: "Criar Backup Completo",
      description: "Faça backup de todos os dados do banco atual",
      action: "Criar Backup",
      icon: Download,
      status: "pending"
    },
    {
      id: 2,
      title: "Configurar Novo Banco",
      description: "Configure o novo projeto Supabase com as mesmas tabelas",
      icon: Database,
      status: "pending"
    },
    {
      id: 3,
      title: "Restaurar Dados",
      description: "Use o arquivo de backup para restaurar no novo banco",
      icon: Upload,
      status: "pending"
    },
    {
      id: 4,
      title: "Verificar Migração",
      description: "Confirme que todos os dados foram migrados corretamente",
      icon: CheckCircle,
      status: "pending"
    }
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Guia de Migração de Banco de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Este guia o ajudará a migrar todos os dados do UNIG Facilities para um novo banco de dados Supabase.
            Siga os passos na ordem para garantir uma migração bem-sucedida.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isFirst = index === 0;
            
            return (
              <div 
                key={step.id} 
                className={`flex items-start gap-4 p-4 rounded-lg border ${
                  isFirst ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 
                  'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isFirst ? 'bg-blue-500' : 'bg-gray-400'
                } text-white flex-shrink-0`}>
                  {isFirst ? (
                    <IconComponent className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-bold">{step.id}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{step.title}</h4>
                    {isFirst && <Badge variant="default">Próximo Passo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {step.description}
                  </p>
                  
                  {step.action && isFirst && (
                    <Button 
                      onClick={onCreateBackup}
                      disabled={isLoading}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isLoading ? "Criando Backup..." : step.action}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Certifique-se de que o novo banco de dados tenha a mesma estrutura 
            de tabelas antes de restaurar o backup. O sistema UNIG Facilities precisa estar configurado no novo projeto.
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h4 className="font-medium mb-2">O que está incluído no backup:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>• Produtos e categorias</div>
            <div>• Movimentações de estoque</div>
            <div>• Usuários e perfis</div>
            <div>• Configurações do sistema</div>
            <div>• Alertas e notificações</div>
            <div>• Logs de segurança</div>
            <div>• Dados de sessões</div>
            <div>• Configurações de categorias</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}