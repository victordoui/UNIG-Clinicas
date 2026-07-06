import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { useSavedReports, useCreateReport, useDeleteReport, useRunReport, type ReportTipo } from "@/hooks/useSavedReports";
import { FileText, Play, Trash2, Plus, Calendar, Bookmark } from "lucide-react";
import { useState } from "react";

const TIPO_LABEL: Record<ReportTipo, string> = {
  estoque: "Estoque",
  compras: "Compras",
  financeiro: "Financeiro",
  fornecedores: "Fornecedores",
  consumo: "Consumo",
};

export default function RelatoriosSalvos() {
  const { data: reports = [], isLoading } = useSavedReports();
  const create = useCreateReport();
  const del = useDeleteReport();
  const run = useRunReport();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<ReportTipo>("estoque");
  const [frequencia, setFrequencia] = useState<string>("none");
  const [emails, setEmails] = useState("");

  const handleCreate = async () => {
    if (!nome.trim()) return;
    await create.mutateAsync({
      nome,
      tipo,
      agendamento: frequencia !== "none"
        ? { frequencia, emails: emails.split(",").map((e) => e.trim()).filter(Boolean) }
        : null,
    });
    setOpen(false);
    setNome("");
    setEmails("");
    setFrequencia("none");
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Bookmark className="h-6 w-6 text-primary" /> Relatórios Salvos</h1>
            <p className="text-muted-foreground mt-1">
              Modelos reutilizáveis com filtros e agendamento opcional.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo relatório</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo relatório salvo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Compras mensais" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as ReportTipo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Agendamento</Label>
                  <Select value={frequencia} onValueChange={setFrequencia}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem agendamento</SelectItem>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {frequencia !== "none" && (
                  <div>
                    <Label>E-mails (separados por vírgula)</Label>
                    <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ana@org.com, pedro@org.com" />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <LoadingButton loading={create.isPending} onClick={handleCreate}>Salvar</LoadingButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : reports.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum relatório salvo" description="Crie modelos reutilizáveis com filtros e agendamento." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => (
              <Card key={r.id} className="animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{r.nome}</CardTitle>
                    <Badge variant="outline">{TIPO_LABEL[r.tipo]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.agendamento && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {r.agendamento.frequencia} · {r.agendamento.emails?.length ?? 0} destinatário(s)
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Última execução: {r.ultima_execucao ? new Date(r.ultima_execucao).toLocaleString("pt-BR") : "—"}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => run.mutate(r.id)}>
                      <Play className="h-3.5 w-3.5 mr-1" />Executar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
