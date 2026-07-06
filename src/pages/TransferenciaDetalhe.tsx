import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTransfer, useSendTransfer, useReceiveTransfer } from "@/hooks/useTransfers";
import { ArrowLeft, Send, PackageCheck, ArrowLeftRight } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  rascunho: "outline", em_transito: "secondary", recebida: "default", cancelada: "destructive",
};

export default function TransferenciaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { data: t, isLoading } = useTransfer(id);
  const send = useSendTransfer();
  const receive = useReceiveTransfer();
  const [recebimentos, setRecebimentos] = useState<Record<string, number>>({});

  useEffect(() => {
    if (t?.items) {
      const init: Record<string, number> = {};
      t.items.forEach((it: any) => { init[it.id] = Number(it.quantidade_enviada); });
      setRecebimentos(init);
    }
  }, [t?.id]);

  if (isLoading || !t) return <MainLayout><div className="p-6">Carregando...</div></MainLayout>;

  const handleSend = () => send.mutate(t.id);
  const handleReceive = () => {
    const items: Record<string, { quantidade_recebida: number }> = {};
    Object.entries(recebimentos).forEach(([k, v]) => { items[k] = { quantidade_recebida: v }; });
    receive.mutate({ id: t.id, items });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/transferencias"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ArrowLeftRight className="h-6 w-6 text-primary" />
                <span>{t.numero ?? "Transferência"}</span>
              </h1>
              <p className="text-muted-foreground text-sm">{t.origem?.nome} → {t.destino?.nome}</p>
            </div>
          </div>
          <Badge variant={statusVariant[t.status] ?? "outline"} className="capitalize">{t.status.replace("_", " ")}</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {t.items?.map((it: any) => (
                <div key={it.id} className="py-3 grid grid-cols-[1fr_120px_120px] gap-3 items-center">
                  <div>
                    <div className="font-medium">{it.products?.name}</div>
                    <div className="text-xs text-muted-foreground">SKU: {it.products?.sku ?? "—"}</div>
                  </div>
                  <div className="text-sm">Enviado: <strong>{it.quantidade_enviada}</strong></div>
                  {t.status === "em_transito" ? (
                    <Input type="number" value={recebimentos[it.id] ?? 0}
                      onChange={(e) => setRecebimentos({ ...recebimentos, [it.id]: Number(e.target.value) || 0 })} />
                  ) : t.quantidade_recebida != null || it.quantidade_recebida != null ? (
                    <div className="text-sm">Recebido: <strong>{it.quantidade_recebida ?? 0}</strong>
                      {it.divergencia != null && it.divergencia !== 0 && <Badge variant="destructive" className="ml-2">Δ {it.divergencia}</Badge>}
                    </div>
                  ) : <div />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          {t.status === "rascunho" && (
            <LoadingButton loading={send.isPending} onClick={handleSend}><Send className="h-4 w-4 mr-2" /> Enviar</LoadingButton>
          )}
          {t.status === "em_transito" && (
            <LoadingButton loading={receive.isPending} onClick={handleReceive}><PackageCheck className="h-4 w-4 mr-2" /> Confirmar recebimento</LoadingButton>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
