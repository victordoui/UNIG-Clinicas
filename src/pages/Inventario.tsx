import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useInventorySessions, useCreateInventorySession } from "@/hooks/useInventorySessions";
import { ClipboardCheck, Plus } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  aberta: "outline",
  em_contagem: "default",
  fechada: "secondary",
};

export default function Inventario() {
  const { data: sessions = [], isLoading } = useInventorySessions();
  const create = useCreateInventorySession();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("ciclico");

  const handleCreate = async () => {
    if (!nome.trim()) return;
    await create.mutateAsync({ nome: nome.trim(), tipo });
    setOpen(false);
    setNome("");
    setTipo("ciclico");
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" /> Inventário</h1>
            <p className="text-muted-foreground mt-1">Sessões de contagem cíclica e ajustes de estoque</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nova sessão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova sessão de inventário</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Inventário cíclico ABR/2026" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ciclico">Cíclico</SelectItem>
                      <SelectItem value="total">Total</SelectItem>
                      <SelectItem value="amostragem">Amostragem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <LoadingButton loading={create.isPending} onClick={handleCreate}>Criar</LoadingButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nenhuma sessão de inventário"
            description="Crie uma sessão para começar a contagem"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <Link key={s.id} to={`/inventario/${s.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{s.nome}</CardTitle>
                      <Badge variant={statusVariant[s.status] ?? "outline"}>{s.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Tipo: <span className="font-medium text-foreground capitalize">{s.tipo}</span></div>
                      <div>Iniciada: {s.iniciada_em ? format(new Date(s.iniciada_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</div>
                      {s.fechada_em && <div>Fechada: {format(new Date(s.fechada_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
