import { useState } from "react";
import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFiscalInvoice, useCancelFiscalInvoice, useCheckFiscalStatus, useSendFiscalEmail } from "@/hooks/useFiscal";
import { RefreshCw, Mail, FileText } from "lucide-react";

export default function FiscalNotaDetalhe() {
  const { id } = useParams();
  const { data, isLoading } = useFiscalInvoice(id);
  const cancel = useCancelFiscalInvoice();
  const check = useCheckFiscalStatus();
  const sendEmail = useSendFiscalEmail();
  const [motivo, setMotivo] = useState("");
  const [open, setOpen] = useState(false);

  if (isLoading) return <MainLayout><div className="p-6">Carregando...</div></MainLayout>;
  const inv = data?.invoice;
  if (!inv) return <MainLayout><div className="p-6">Nota não encontrada</div></MainLayout>;

  const handleCancel = async () => {
    await cancel.mutateAsync({ id: inv.id, motivo });
    setOpen(false);
  };

  return (
    <MainLayout>
      <div className="container py-6 animate-fade-in space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <span>Nota {inv.numero ?? "—"}/{inv.serie ?? "—"}</span>
            </h1>
            <p className="text-muted-foreground">{inv.modelo === "55" ? "NF-e (modelo 55)" : "NFC-e (modelo 65)"} · {inv.ambiente}</p>
          </div>
          <Badge>{inv.status}</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><strong>Chave de acesso:</strong> {inv.chave_acesso ?? "—"}</div>
            <div><strong>Protocolo:</strong> {inv.protocolo ?? "—"}</div>
            <div><strong>Destinatário:</strong> {inv.destinatario_nome ?? "—"}</div>
            <div><strong>Documento:</strong> {inv.destinatario_documento ?? "—"}</div>
            <div><strong>Valor total:</strong> R$ {Number(inv.valor_total).toFixed(2)}</div>
            <div><strong>Emitida em:</strong> {inv.emitida_em ? new Date(inv.emitida_em).toLocaleString("pt-BR") : "—"}</div>
            {inv.mensagem_sefaz && <div className="md:col-span-2"><strong>Mensagem SEFAZ:</strong> {inv.mensagem_sefaz}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>CFOP</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Vlr Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.items.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.numero_item}</TableCell>
                    <TableCell>{it.descricao}</TableCell>
                    <TableCell>{it.ncm ?? "—"}</TableCell>
                    <TableCell>{it.cfop ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(it.quantidade).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {Number(it.valor_unitario).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {Number(it.valor_total).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Histórico SEFAZ</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data!.events.length === 0 && <p className="text-muted-foreground">Sem eventos.</p>}
            {data!.events.map((e: any) => (
              <div key={e.id} className="border-l-2 border-primary/40 pl-3 py-1">
                <div className="font-medium capitalize">{e.tipo.replace("_", " ")}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</div>
                {e.mensagem && <div className="text-xs">{e.mensagem}</div>}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          {inv.xml_url && <Button variant="outline" asChild><a href={inv.xml_url} target="_blank" rel="noopener noreferrer">Baixar XML</a></Button>}
          {inv.danfe_url && <Button variant="outline" asChild><a href={inv.danfe_url} target="_blank" rel="noopener noreferrer">Baixar DANFE</a></Button>}
          {inv.status === "processando" && (
            <Button variant="outline" disabled={check.isPending} onClick={() => check.mutate(inv.id)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar status
            </Button>
          )}
          {inv.status === "autorizada" && (
            <Button variant="outline" disabled={sendEmail.isPending} onClick={() => sendEmail.mutate({ id: inv.id })}>
              <Mail className="h-4 w-4 mr-2" /> Reenviar e-mail
            </Button>
          )}
          {inv.status === "autorizada" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="destructive">Cancelar nota</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Cancelar nota fiscal</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Informe a justificativa (mín. 15 caracteres). Prazo legal: 24h para NF-e, 30min para NFC-e.
                </p>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Voltar</Button>
                  <Button variant="destructive" disabled={motivo.length < 15 || cancel.isPending} onClick={handleCancel}>
                    Confirmar cancelamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
