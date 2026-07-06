import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Mail, CheckCircle2, Factory, Receipt, Truck, PackageCheck, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SupplierTrackerStepKey =
  | "emitido"
  | "enviado"
  | "confirmado"
  | "producao"
  | "faturado"
  | "despachado"
  | "entregue";

interface StepDef {
  key: SupplierTrackerStepKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  { key: "emitido", label: "Pedido emitido", icon: FileText },
  { key: "enviado", label: "Enviado ao fornecedor", icon: Mail },
  { key: "confirmado", label: "Confirmado", icon: CheckCircle2 },
  { key: "producao", label: "Em produção/separação", icon: Factory },
  { key: "faturado", label: "Nota fiscal emitida", icon: Receipt },
  { key: "despachado", label: "Em transporte", icon: Truck },
  { key: "entregue", label: "Entregue / Aceite", icon: PackageCheck },
];

interface Props {
  orderStatus: string | null | undefined;
  hasInvoice: boolean;
  hasAcceptedInvoice?: boolean;
  emittedAt?: string | null;
  invoiceAt?: string | null;
  deliveredAt?: string | null;
}

function computeCurrentIndex(p: Props): number {
  if (p.orderStatus === "recebido_total") return 6;
  if (p.orderStatus === "recebido_parcial" || p.deliveredAt) return 5;
  if (p.hasAcceptedInvoice) return 5;
  if (p.hasInvoice) return 4;
  if (p.orderStatus === "confirmado") return 3;
  if (p.orderStatus === "enviado_fornecedor") return 2;
  return 0;
}

export function SupplierOrderTracker(props: Props) {
  const currentIdx = computeCurrentIndex(props);

  return (
    <Card className="rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Acompanhamento do pedido</CardTitle>
      </CardHeader>
      <CardContent>
        {/* desktop horizontal */}
        <div className="hidden md:grid grid-cols-7 gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentIdx;
            const current = i === currentIdx;
            return (
              <div key={s.key} className="flex flex-col items-center text-center gap-2">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    done && "bg-emerald-500 border-emerald-500 text-white",
                    current && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse",
                    !done && !current && "bg-muted border-muted-foreground/20 text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div
                  className={cn(
                    "text-xs font-medium leading-tight",
                    current ? "text-foreground" : done ? "text-emerald-700" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            );
          })}
        </div>

        {/* connector line desktop */}
        <div className="hidden md:block relative -mt-[78px] mb-4 px-5 pointer-events-none">
          <div className="h-0.5 bg-muted" />
          <div
            className="h-0.5 bg-emerald-500 -mt-0.5 transition-all"
            style={{ width: `${(Math.min(currentIdx, STEPS.length - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <div className="hidden md:block h-12" />

        {/* mobile vertical */}
        <ol className="md:hidden space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentIdx;
            const current = i === currentIdx;
            return (
              <li key={s.key} className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center border-2 shrink-0",
                    done && "bg-emerald-500 border-emerald-500 text-white",
                    current && "bg-primary border-primary text-primary-foreground",
                    !done && !current && "bg-muted border-muted-foreground/20 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="pt-1">
                  <div className="text-sm font-medium">{s.label}</div>
                  {current && <Badge variant="outline" className="mt-1 text-xs">Etapa atual</Badge>}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
