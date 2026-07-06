import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Package } from "lucide-react";
import { ProductEntryModal } from "@/components/products/ProductEntryModal";
import { ProductWithdrawalModal } from "@/components/products/ProductWithdrawalModal";
import { NewProductModal } from "@/components/products/NewProductModal";
import { cn } from "@/lib/utils";

interface QuickActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickActionModal({ open, onOpenChange }: QuickActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<'entry' | 'withdrawal' | 'new' | null>(null);

  const actions = [
    {
      id: 'entry' as const,
      title: 'Entrada de Produto',
      description: 'Registrar entrada no estoque',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900',
    },
    {
      id: 'withdrawal' as const,
      title: 'Saída de Produto',
      description: 'Registrar saída do estoque',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900',
    },
    {
      id: 'new' as const,
      title: 'Novo Produto',
      description: 'Cadastrar produto completo',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900',
    },
  ];

  const handleActionSelect = (actionId: typeof actions[0]['id']) => {
    setSelectedAction(actionId);
    onOpenChange(false);
  };

  const handleCloseSubModal = () => {
    setSelectedAction(null);
  };

  return (
    <>
      {/* Modal de Seleção de Ação */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ação Rápida</DialogTitle>
            <DialogDescription>
              Selecione a ação que deseja realizar
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionSelect(action.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 border-transparent transition-all duration-200",
                  action.bgColor,
                  "hover:border-primary hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                <div className={cn("p-3 rounded-full bg-background", action.color)}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modais Específicos */}
      <ProductEntryModal 
        open={selectedAction === 'entry'} 
        onOpenChange={(open) => !open && handleCloseSubModal()}
      />
      <ProductWithdrawalModal 
        open={selectedAction === 'withdrawal'} 
        onOpenChange={(open) => !open && handleCloseSubModal()}
      />
      <NewProductModal 
        open={selectedAction === 'new'} 
        onOpenChange={(open) => !open && handleCloseSubModal()}
      />
    </>
  );
}