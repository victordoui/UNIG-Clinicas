import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";


interface ImportLoadingOverlayProps {
  open: boolean;
  processed: number;
  total: number;
  title?: string;
  subtitle?: string;
}

export function ImportLoadingOverlay({
  open,
  processed,
  total,
  title = "Importando...",
  subtitle,
}: ImportLoadingOverlayProps) {
  if (!open) return null;

  const safeTotal = Math.max(total, 1);
  const percentage = Math.min(100, Math.round((processed / safeTotal) * 100));
  const label = subtitle ?? `${processed.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} registros processados`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-2xl mx-4 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="space-y-2">
          <Progress value={percentage} />
          <p className="text-xs text-muted-foreground">
            Não feche esta janela até a conclusão.
          </p>
        </div>
      </div>
    </div>
  );
}
