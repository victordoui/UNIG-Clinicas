import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, UserPlus, RefreshCw, Copy, Eye, RotateCw, X, Search,
  Clock, CheckCircle2, XCircle, AlertCircle, Link as LinkIcon, Check,
} from "lucide-react";
import {
  useSupplierInvitations, useCreateSupplierInvitation,
  useResendSupplierInvitation, useCancelSupplierInvitation,
  buildInvitationLink, type SupplierInvitation,
} from "@/hooks/useSupplierInvitations";
import {
  INVITATION_STATUS_BADGE, INVITATION_STATUS_LABEL,
  TIPO_FORNECEDOR_LABEL, SUPPLIER_CATEGORIES,
} from "@/lib/supplierLabels";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Status = "pendente" | "usado" | "expirado" | "cancelado";

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function ConvitesFornecedores() {
  const { toast } = useToast();
  const { isSuperAdmin, currentRole } = useAuth();
  const canManage = isSuperAdmin || currentRole === "admin";

  const { data: invitations = [], isLoading, refetch } = useSupplierInvitations();
  const createInv = useCreateSupplierInvitation();
  const resendInv = useResendSupplierInvitation();
  const cancelInv = useCancelSupplierInvitation();

  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [details, setDetails] = useState<SupplierInvitation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SupplierInvitation | null>(null);

  const counts = useMemo(() => {
    const c = { pendente: 0, usado: 0, expirado: 0, cancelado: 0 };
    invitations.forEach((i) => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [invitations]);

  const filtered = useMemo(() => {
    return invitations.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (tipoFilter !== "all" && i.tipo_fornecedor !== tipoFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          i.email.toLowerCase().includes(s) ||
          (i.nome_empresa ?? "").toLowerCase().includes(s) ||
          (i.cnpj ?? "").includes(s)
        );
      }
      return true;
    });
  }, [invitations, statusFilter, tipoFilter, search]);

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(buildInvitationLink(token));
    toast({ title: "Link copiado", description: "Cole onde precisar para enviar ao fornecedor." });
  };

  const handleResend = async (inv: SupplierInvitation) => {
    try {
      const res = await resendInv.mutateAsync({ invitation_id: inv.id, validade_dias: 5 });
      await navigator.clipboard.writeText(res.link);
      toast({ title: "Convite reenviado", description: "Novo link copiado para a área de transferência." });
    } catch (e: any) {
      toast({ title: "Erro ao reenviar", description: e.message, variant: "destructive" });
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelInv.mutateAsync(cancelTarget.id);
      toast({ title: "Convite cancelado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setCancelTarget(null);
    }
  };

  const stats = [
    { key: "pendente" as Status, label: "Pendentes", value: counts.pendente, icon: Clock, color: "text-amber-600" },
    { key: "usado" as Status, label: "Usados", value: counts.usado, icon: CheckCircle2, color: "text-emerald-600" },
    { key: "expirado" as Status, label: "Expirados", value: counts.expirado, icon: AlertCircle, color: "text-muted-foreground" },
    { key: "cancelado" as Status, label: "Cancelados", value: counts.cancelado, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <PageHeader
          icon={Mail}
          title="Convites de Fornecedores"
          description="Gere links únicos para criar o acesso inicial do fornecedor ao Portal."
          actions={canManage ? (
            <>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
              </Button>
              <Button size="sm" className="bg-gradient-primary text-white" onClick={() => setOpenNew(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Novo convite
              </Button>
            </>
          ) : null}
        />

        {!canManage ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Você não tem permissão para gerenciar convites.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((c) => {
                const Icon = c.icon;
                const active = statusFilter === c.key;
                return (
                  <Card
                    key={c.key}
                    onClick={() => setStatusFilter(active ? "all" : c.key)}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md animate-fade-in",
                      active && "ring-2 ring-primary"
                    )}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-muted/50", c.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{c.value}</div>
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Buscar por e-mail, empresa ou CNPJ</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Digite para filtrar..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de fornecedor</Label>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="ambos">Produto e Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Listing */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground animate-pulse-slow">Carregando convites...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg">
                Nenhum convite encontrado com os filtros atuais.
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((i) => {
                        const canCancel = i.status === "pendente";
                        const canResend = i.status === "pendente" || i.status === "expirado" || i.status === "cancelado";
                        return (
                          <TableRow key={i.id} className="animate-fade-in">
                            <TableCell className="font-medium text-sm">{i.email}</TableCell>
                            <TableCell className="text-sm">{i.nome_empresa || "—"}</TableCell>
                            <TableCell className="text-sm">{i.cnpj || "—"}</TableCell>
                            <TableCell className="text-sm">{TIPO_FORNECEDOR_LABEL[i.tipo_fornecedor] || i.tipo_fornecedor}</TableCell>
                            <TableCell className="text-sm">{i.categoria_esperada || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(INVITATION_STATUS_BADGE[i.status])}>
                                {INVITATION_STATUS_LABEL[i.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{fmt(i.created_at)}</TableCell>
                            <TableCell className="text-xs">{fmt(i.expires_at)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => copyLink(i.token)} title="Copiar link">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDetails(i)} title="Detalhes">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canResend && (
                                  <Button variant="ghost" size="sm" onClick={() => handleResend(i)} title="Reenviar">
                                    <RotateCw className="h-4 w-4" />
                                  </Button>
                                )}
                                {canCancel && (
                                  <Button variant="ghost" size="sm" onClick={() => setCancelTarget(i)} title="Cancelar">
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile */}
                <div className="md:hidden space-y-2">
                  {filtered.map((i) => (
                    <div key={i.id} className="border rounded-lg p-3 space-y-2 animate-fade-in">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{i.email}</div>
                          {i.nome_empresa && <div className="text-xs text-muted-foreground">{i.nome_empresa}</div>}
                        </div>
                        <Badge variant="outline" className={cn(INVITATION_STATUS_BADGE[i.status])}>
                          {INVITATION_STATUS_LABEL[i.status]}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Tipo: {TIPO_FORNECEDOR_LABEL[i.tipo_fornecedor] || i.tipo_fornecedor}</div>
                        <div>Criado em {fmt(i.created_at)}</div>
                        <div>Expira em {fmt(i.expires_at)}</div>
                      </div>
                      <div className="flex gap-1 flex-wrap pt-1">
                        <Button variant="outline" size="sm" onClick={() => copyLink(i.token)}>
                          <Copy className="h-3 w-3 mr-1" /> Link
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDetails(i)}>
                          <Eye className="h-3 w-3 mr-1" /> Detalhes
                        </Button>
                        {(i.status === "pendente" || i.status === "expirado" || i.status === "cancelado") && (
                          <Button variant="outline" size="sm" onClick={() => handleResend(i)}>
                            <RotateCw className="h-3 w-3 mr-1" /> Reenviar
                          </Button>
                        )}
                        {i.status === "pendente" && (
                          <Button variant="outline" size="sm" onClick={() => setCancelTarget(i)}>
                            <X className="h-3 w-3 mr-1 text-destructive" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <NewSupplierInvitationModal open={openNew} onOpenChange={setOpenNew} />

      <SupplierInvitationDetailsDrawer
        invitation={details}
        open={!!details}
        onOpenChange={(o) => !o && setDetails(null)}
        onCopy={copyLink}
      />

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite?</AlertDialogTitle>
            <AlertDialogDescription>
              O link de <strong>{cancelTarget?.email}</strong> ficará inacessível.
              O convite continuará visível no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground">
              Cancelar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

/* -------------------- New invitation modal -------------------- */

function NewSupplierInvitationModal({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const createInv = useCreateSupplierInvitation();

  const [form, setForm] = useState({
    email: "",
    nome_empresa: "",
    cnpj: "",
    tipo_fornecedor: "produto" as "produto" | "servico" | "ambos",
    categoria_esperada: "",
    observacao_interna: "",
    validade_dias: 5,
  });
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setForm({
      email: "", nome_empresa: "", cnpj: "",
      tipo_fornecedor: "produto", categoria_esperada: "",
      observacao_interna: "", validade_dias: 5,
    });
    setInviteUrl(null);
    setCopied(false);
  };

  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const handleGenerate = async () => {
    if (!form.email) {
      toast({ title: "Informe o e-mail", variant: "destructive" });
      return;
    }
    try {
      const res = await createInv.mutateAsync(form);
      setInviteUrl(res.link);
      toast({ title: "Convite criado", description: "Link único gerado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Novo convite de fornecedor
          </ModalTitle>
          <ModalDescription>
            O cadastro inicial cria apenas o acesso ao portal. O fornecedor completará os dados depois.
          </ModalDescription>
        </ModalHeader>

        {!inviteUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail principal *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="fornecedor@empresa.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome / Razão social</Label>
                <Input value={form.nome_empresa} onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo_fornecedor} onValueChange={(v) => setForm({ ...form, tipo_fornecedor: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                    <SelectItem value="ambos">Produto e Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria esperada</Label>
                <Select value={form.categoria_esperada} onValueChange={(v) => setForm({ ...form, categoria_esperada: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="max-h-[260px]">
                    {SUPPLIER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observação interna</Label>
              <Textarea rows={2} value={form.observacao_interna} onChange={(e) => setForm({ ...form, observacao_interna: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Validade do convite</Label>
              <Select value={String(form.validade_dias)} onValueChange={(v) => setForm({ ...form, validade_dias: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} {d === 1 ? "dia" : "dias"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ModalFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={createInv.isPending}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={createInv.isPending} className="bg-gradient-primary text-white">
                {createInv.isPending ? "Gerando..." : "Gerar convite"}
              </Button>
            </ModalFooter>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="text-muted-foreground">Convite para</div>
              <div className="font-medium">{form.email}</div>
            </div>
            <div className="space-y-2">
              <Label>Link de convite (uso único)</Label>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar">
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <ModalFooter>
              <Button variant="outline" onClick={() => reset()}>Gerar outro</Button>
              <Button onClick={() => handleClose(false)} className="bg-gradient-primary text-white">Concluir</Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

/* -------------------- Details drawer -------------------- */

function SupplierInvitationDetailsDrawer({
  invitation, open, onOpenChange, onCopy,
}: {
  invitation: SupplierInvitation | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCopy: (token: string) => void;
}) {
  if (!invitation) return null;
  const url = buildInvitationLink(invitation.token);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do convite</SheetTitle>
          <SheetDescription>{invitation.email}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn(INVITATION_STATUS_BADGE[invitation.status])}>
              {INVITATION_STATUS_LABEL[invitation.status]}
            </Badge>
            <Badge variant="outline">{TIPO_FORNECEDOR_LABEL[invitation.tipo_fornecedor] || invitation.tipo_fornecedor}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Empresa" value={invitation.nome_empresa || "—"} />
            <Field label="CNPJ" value={invitation.cnpj || "—"} />
            <Field label="Categoria" value={invitation.categoria_esperada || "—"} />
            <Field label="Criado em" value={fmt(invitation.created_at)} />
            <Field label="Expira em" value={fmt(invitation.expires_at)} />
            {invitation.used_at && <Field label="Usado em" value={fmt(invitation.used_at)} />}
          </div>

          {invitation.observacao_interna && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-1">Observação interna</div>
              {invitation.observacao_interna}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Link do convite</Label>
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => onCopy(invitation.token)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
