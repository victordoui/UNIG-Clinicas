import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PanelRight, ChevronDown, Building2, ShoppingCart, FileText, Star, FileSignature } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { usePurchaseOrders, ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from "@/hooks/usePurchaseOrders";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useSupplierContracts } from "@/hooks/useSupplierContracts";
import { useEvaluationsBySupplier } from "@/hooks/useSupplierEvaluations";
import { formatBRL } from "@/lib/purchaseLabels";
import { format } from "date-fns";

type Context =
  | { kind: "order"; orderId: string; supplierId?: string | null; requestId?: string | null }
  | { kind: "request"; requestId: string; solicitanteId?: string | null; categoria?: string | null; centroCusto?: string | null };

interface Props {
  context: Context;
}

function Section({ icon: Icon, title, count, defaultOpen = false, children }: { icon: any; title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between py-2 px-1 hover:bg-accent/40 rounded-md">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-primary" />
          {title}
          {typeof count === "number" && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{count}</Badge>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-1 pr-1 pt-1 pb-2 space-y-1.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function PanelBody({ context }: Props) {
  const navigate = useNavigate();
  const supplierId = context.kind === "order" ? context.supplierId ?? null : null;
  const { data: suppliers = [] } = useSuppliers();
  const { data: orders = [] } = usePurchaseOrders();
  const { data: requests = [] } = usePurchaseRequests();
  const { data: contracts = [] } = useSupplierContracts(supplierId ?? undefined);
  const { data: evaluations = [] } = useEvaluationsBySupplier(supplierId ?? undefined);

  const supplier = supplierId ? suppliers.find((s) => s.id === supplierId) : null;

  // Open orders for this supplier (exclude current order)
  const openStatuses = ["emitido", "enviado_fornecedor", "confirmado", "em_transito", "parcialmente_recebido"];
  const supplierOpenOrders = supplierId
    ? orders.filter((o: any) =>
        o.supplier_id === supplierId &&
        openStatuses.includes(o.status) &&
        (context.kind !== "order" || o.id !== context.orderId)
      ).slice(0, 6)
    : [];

  const activeContracts = contracts.filter((c) => c.status === "ativo").slice(0, 5);

  const avgEval = evaluations.length
    ? (evaluations.reduce((s, e) => s + Number(e.nota_geral || 0), 0) / evaluations.length).toFixed(1)
    : null;

  // Requester history (for SC context)
  let requesterHistory: any[] = [];
  let categoryHistory: any[] = [];
  if (context.kind === "request") {
    requesterHistory = context.solicitanteId
      ? requests.filter((r: any) => r.solicitante_id === context.solicitanteId && r.id !== context.requestId).slice(0, 5)
      : [];
    categoryHistory = context.categoria
      ? requests.filter((r: any) => r.categoria === context.categoria && r.id !== context.requestId).slice(0, 5)
      : [];
  }

  return (
    <div className="space-y-1 animate-fade-in">
      {supplier && (
        <Section icon={Building2} title="Fornecedor" defaultOpen>
          <button
            onClick={() => navigate(`/fornecedores?id=${supplier.id}`)}
            className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
          >
            <div className="text-sm font-medium">{supplier.nome_fantasia || supplier.razao_social}</div>
            {supplier.cnpj && <div className="text-xs text-muted-foreground">{supplier.cnpj}</div>}
          </button>
        </Section>
      )}

      {supplierId && (
        <Section icon={ShoppingCart} title="Pedidos abertos" count={supplierOpenOrders.length} defaultOpen>
          {supplierOpenOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">Sem outros pedidos abertos.</p>
          ) : supplierOpenOrders.map((o: any) => (
            <button key={o.id} onClick={() => navigate(`/pedidos/${o.id}`)}
              className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs truncate">{o.numero}</div>
                <div className="text-xs text-muted-foreground">{formatBRL(o.valor_total)}</div>
              </div>
              <Badge variant="outline" className={`${ORDER_STATUS_BADGE[o.status as keyof typeof ORDER_STATUS_BADGE]} text-[10px] shrink-0`}>
                {ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL]}
              </Badge>
            </button>
          ))}
        </Section>
      )}

      {supplierId && (
        <Section icon={FileSignature} title="Contratos vigentes" count={activeContracts.length}>
          {activeContracts.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">Sem contratos ativos.</p>
          ) : activeContracts.map((c) => (
            <div key={c.id} className="p-2 rounded-md hover:bg-accent transition-colors">
              <div className="text-sm font-medium">{c.numero}</div>
              <div className="text-xs text-muted-foreground">
                Vigência {format(new Date(c.inicio), "dd/MM/yyyy")} – {format(new Date(c.fim), "dd/MM/yyyy")}
              </div>
            </div>
          ))}
        </Section>
      )}

      {supplierId && (
        <Section icon={Star} title={`Avaliações${avgEval ? ` · média ${avgEval}` : ""}`} count={evaluations.length}>
          {evaluations.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">Sem avaliações.</p>
          ) : evaluations.slice(0, 5).map((e) => (
            <div key={e.id} className="p-2 rounded-md hover:bg-accent transition-colors text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">Nota {Number(e.nota_geral).toFixed(1)}</span>
                <span className="text-muted-foreground">{format(new Date(e.created_at), "dd/MM/yyyy")}</span>
              </div>
              <div className="text-muted-foreground mt-0.5">
                Pontual. {e.pontualidade} · Qual. {e.qualidade} · Atend. {e.atendimento} · Preço {e.preco}
              </div>
            </div>
          ))}
        </Section>
      )}

      {context.kind === "request" && (
        <>
          <Section icon={FileText} title="Outras SCs do solicitante" count={requesterHistory.length} defaultOpen>
            {requesterHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma outra SC encontrada.</p>
            ) : requesterHistory.map((r: any) => (
              <button key={r.id} onClick={() => navigate(`/solicitacoes/${r.id}`)}
                className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors">
                <div className="font-mono text-xs">{r.numero}</div>
                <div className="text-xs truncate">{r.item_descricao}</div>
              </button>
            ))}
          </Section>
          <Section icon={FileText} title="Mesma categoria" count={categoryHistory.length}>
            {categoryHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-1">Sem SCs da mesma categoria.</p>
            ) : categoryHistory.map((r: any) => (
              <button key={r.id} onClick={() => navigate(`/solicitacoes/${r.id}`)}
                className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors">
                <div className="font-mono text-xs">{r.numero}</div>
                <div className="text-xs truncate">{r.item_descricao}</div>
              </button>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

/**
 * Trigger button + Sheet that opens the contextual related-documents panel.
 * Drop it into the `actions` slot of <ObjectPageHeader>.
 */
export function RelatedPanelTrigger({ context }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PanelRight className="h-4 w-4 mr-1" /> Relacionados
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <PanelRight className="h-4 w-4 text-primary" /> Relacionados
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <PanelBody context={context} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
