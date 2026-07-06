import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFiscalInvoices } from "@/hooks/useFiscal";
import { ScrollText } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  processando: "bg-blue-100 text-blue-800",
  autorizada: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",
  cancelada: "bg-zinc-200 text-zinc-700",
  inutilizada: "bg-zinc-200 text-zinc-700",
};

export default function FiscalNotas() {
  const [status, setStatus] = useState<string>("");
  const [modelo, setModelo] = useState<string>("");
  const { data, isLoading } = useFiscalInvoices({
    status: status || undefined,
    modelo: modelo || undefined,
  });

  return (
    <MainLayout>
      <div className="container py-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6 text-primary" /> Notas Fiscais</h1>
            <p className="text-muted-foreground">NF-e (modelo 55) e NFC-e (modelo 65) emitidas</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3 items-center">
              <CardTitle className="mr-auto">Lista</CardTitle>
              <Select value={modelo} onValueChange={(v) => setModelo(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Modelo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os modelos</SelectItem>
                  <SelectItem value="55">NF-e (55)</SelectItem>
                  <SelectItem value="65">NFC-e (65)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                  <SelectItem value="autorizada">Autorizada</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emitida em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7}>Carregando...</TableCell></TableRow>}
                {!isLoading && (data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma nota fiscal encontrada</TableCell></TableRow>
                )}
                {(data ?? []).map((n: any) => (
                  <TableRow key={n.id} className="hover:bg-muted/40">
                    <TableCell>
                      <Link to={`/fiscal/notas/${n.id}`} className="font-medium hover:underline">
                        {n.numero ? `${n.numero}/${n.serie}` : "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{n.modelo === "55" ? "NF-e" : "NFC-e"}</TableCell>
                    <TableCell className="capitalize">{n.tipo.replace("_", " ")}</TableCell>
                    <TableCell>{n.destinatario_nome ?? "—"}</TableCell>
                    <TableCell className="text-right">R$ {Number(n.valor_total).toFixed(2)}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[n.status]}>{n.status}</Badge></TableCell>
                    <TableCell>{n.emitida_em ? new Date(n.emitida_em).toLocaleString("pt-BR") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
