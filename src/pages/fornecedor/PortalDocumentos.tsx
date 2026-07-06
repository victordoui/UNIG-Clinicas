import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Upload, Eye, AlertTriangle, CheckCircle2, Clock, XCircle, FileSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useSupplierDocuments,
  useUploadSupplierDocument,
  getSupplierDocSignedUrl,
} from "@/hooks/useSupplierPortal";
import {
  DOC_STATUS_LABEL,
  DOC_STATUS_BADGE,
  type SupplierDocStatus,
} from "@/lib/supplierLabels";
import { format } from "date-fns";

export default function PortalDocumentos() {
  const { data: docs = [], isLoading } = useSupplierDocuments();
  const upload = useUploadSupplierDocument();
  const { toast } = useToast();
  const [openDoc, setOpenDoc] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validade, setValidade] = useState("");

  const summary = useMemo(() => {
    const c: Record<SupplierDocStatus, number> = {
      nao_enviado: 0, enviado: 0, em_analise: 0, aprovado: 0, reprovado: 0, vencido: 0,
    };
    docs.forEach((d: any) => { c[d.status as SupplierDocStatus] = (c[d.status as SupplierDocStatus] ?? 0) + 1; });
    return c;
  }, [docs]);

  const handleUpload = async () => {
    if (!openDoc || !file) return;
    try {
      await upload.mutateAsync({
        tipo: openDoc.tipo,
        nome: openDoc.nome,
        obrigatorio: openDoc.obrigatorio,
        file,
        validade: validade || null,
      });
      toast({ title: "Documento enviado", description: openDoc.nome });
      setOpenDoc(null); setFile(null); setValidade("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha no envio", description: e.message });
    }
  };

  const view = async (path: string) => {
    try {
      const url = await getSupplierDocSignedUrl(path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao abrir", description: e.message });
    }
  };

  const cards = [
    { key: "aprovado", label: "Aprovados", icon: CheckCircle2, color: "text-emerald-600" },
    { key: "nao_enviado", label: "Pendentes de envio", icon: Clock, color: "text-amber-600" },
    { key: "em_analise", label: "Em análise", icon: FileSearch, color: "text-indigo-600" },
    { key: "reprovado", label: "Reprovados", icon: XCircle, color: "text-red-600" },
    { key: "vencido", label: "Vencidos", icon: AlertTriangle, color: "text-rose-600" },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Envie, acompanhe e atualize os documentos necessários para manter seu cadastro ativo.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Card key={c.key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold mt-1">{summary[c.key as SupplierDocStatus] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-muted-foreground">Carregando…</p>
          ) : (
            <div className="divide-y">
              {docs.map((d: any) => (
                <div key={d.tipo} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{d.nome}</p>
                      {d.obrigatorio && <Badge variant="outline" className="text-[10px]">obrigatório</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-3">
                      {d.enviado_em && <span>Enviado: {format(new Date(d.enviado_em), "dd/MM/yyyy")}</span>}
                      {d.validade && <span>Validade: {format(new Date(d.validade), "dd/MM/yyyy")}</span>}
                      {d.observacao_analise && <span className="text-orange-700">Obs: {d.observacao_analise}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={DOC_STATUS_BADGE[d.status as SupplierDocStatus]}>
                    {DOC_STATUS_LABEL[d.status as SupplierDocStatus]}
                  </Badge>
                  <div className="flex gap-2">
                    {d.file_path && (
                      <Button size="sm" variant="outline" onClick={() => view(d.file_path)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                      </Button>
                    )}
                    <Button size="sm" onClick={() => { setOpenDoc(d); setValidade(d.validade ?? ""); }}>
                      <Upload className="h-3.5 w-3.5 mr-1" /> {d.file_path ? "Substituir" : "Enviar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openDoc} onOpenChange={(v) => { if (!v) { setOpenDoc(null); setFile(null); setValidade(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar documento — {openDoc?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo (PDF, JPG ou PNG)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            {openDoc?._template?.precisaValidade && (
              <div className="space-y-1.5">
                <Label className="text-xs">Validade</Label>
                <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDoc(null)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!file || upload.isPending}>
              {upload.isPending ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
