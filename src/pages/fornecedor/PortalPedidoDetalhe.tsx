import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, FileText, Upload, Building2, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { SupplierOrderTracker } from "@/components/fornecedor/SupplierOrderTracker";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE } from "@/hooks/usePurchaseOrders";
import { useSupplierInvoices } from "@/hooks/useSupplierPortal";
import { formatBRL } from "@/lib/purchaseLabels";

export default function PortalPedidoDetalhe() {
  const { id } = useParams();
  const { data: invoices = [] } = useSupplierInvoices();

  const { data: order, isLoading } = useQuery({
    queryKey: ["portal-order", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("purchase_orders")
        .select("*, purchase_requests(numero, item_descricao, quantidade, categoria)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const orderInvoices = invoices.filter((i: any) => i.purchase_order_id === id);
  const hasInvoice = orderInvoices.length > 0;
  const hasAccepted = orderInvoices.some((i: any) => i.status === "aprovada");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">Pedido não encontrado.</CardContent></Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Link to="/portal-fornecedor/pedidos">
        <Button variant="ghost" size="sm" className="text-primary">
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar para pedidos
        </Button>
      </Link>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Pedido {order.numero}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {order.purchase_requests?.item_descricao ?? "—"}
              </p>
            </div>
            <Badge variant="outline" className={ORDER_STATUS_BADGE[order.status as keyof typeof ORDER_STATUS_BADGE]}>
              {ORDER_STATUS_LABEL[order.status as keyof typeof ORDER_STATUS_LABEL] ?? order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Solicitação</div>
            <div className="font-medium">{order.purchase_requests?.numero ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Categoria</div>
            <div className="font-medium">{order.purchase_requests?.categoria ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Valor total</div>
            <div className="font-medium">{formatBRL(Number(order.valor_total) || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Prazo entrega</div>
            <div className="font-medium">{order.prazo_entrega_dias ? `${order.prazo_entrega_dias} dias` : "—"}</div>
          </div>
        </CardContent>
      </Card>

      <SupplierOrderTracker
        orderStatus={order.status}
        hasInvoice={hasInvoice}
        hasAcceptedInvoice={hasAccepted}
        emittedAt={order.created_at}
        invoiceAt={orderInvoices[0]?.enviado_em}
      />

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notas fiscais deste pedido</CardTitle>
        </CardHeader>
        <CardContent>
          {orderInvoices.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">Nenhuma nota fiscal enviada para este pedido.</p>
              <Link to="/portal-fornecedor/notas-fiscais">
                <Button size="sm"><Upload className="h-4 w-4 mr-2" /> Enviar nota fiscal</Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {orderInvoices.map((i: any) => (
                <li key={i.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">NF {i.numero_nf}{i.serie ? `-${i.serie}` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      Enviada em {new Date(i.enviado_em).toLocaleDateString("pt-BR")} · {formatBRL(Number(i.valor) || 0)}
                    </div>
                  </div>
                  <Badge variant="outline">{i.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
