import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INVITEE_TYPES } from "@/lib/invitationConstants";
import { Copy, Check, Link as LinkIcon, Eye } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function NewInvitationModal({ open, onOpenChange, onCreated }: Props) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [inviteeType, setInviteeType] = useState<string>("visitante");
  const [days, setDays] = useState<string>("5");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail(""); setInviteeType("visitante"); setDays("5"); setNote("");
    setInviteUrl(null); setExpiresAt(null); setCopied(false);
  };

  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const handleGenerate = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast({ title: "E-mail inválido", variant: "destructive" }); return;
    }
    if (!organization?.organization_id) {
      toast({ title: "Organização não identificada", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Sessão expirada", variant: "destructive" }); return;
      }
      const { data, error } = await supabase.functions.invoke("create-invitation", {
        body: {
          email: cleanEmail,
          invitee_type: inviteeType,
          internal_note: note.trim() || undefined,
          organization_id: organization.organization_id,
          expires_in_days: Number(days),
        },
      });
      if (error) {
        let serverMsg = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) serverMsg = body.error;
          } else if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            try { const parsed = JSON.parse(txt); if (parsed?.error) serverMsg = parsed.error; }
            catch { if (txt) serverMsg = txt; }
          }
        } catch { /* ignore */ }
        throw new Error(serverMsg);
      }
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar convite");

      const url = `${window.location.origin}/aceitar-convite/${data.token}`;
      setInviteUrl(url);
      setExpiresAt(data.expires_at);
      toast({ title: "Convite criado", description: "Link único de uso pronto para envio." });
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Não foi possível gerar o convite", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try { await navigator.share({ title: "Convite UNIG Facilities", url: inviteUrl }); }
      catch {/* user cancelled */}
    } else {
      copy();
    }
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Novo convite de acesso
          </ModalTitle>
          <ModalDescription>
            O convidado entrará como <strong>{inviteeType === 'solicitante' ? 'Solicitante' : 'Visitante'}</strong>. Cargo, setor e permissões definitivas são definidos depois.
          </ModalDescription>
        </ModalHeader>

        {!inviteUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail institucional *</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="convidado@unig.br" disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de usuário esperado *</Label>
              <Select value={inviteeType} onValueChange={setInviteeType} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITEE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Validade do convite</Label>
              <Select value={days} onValueChange={setDays} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} {d === 1 ? "dia" : "dias"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Observação interna (opcional)</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anotações visíveis apenas para a administração" disabled={loading} />
            </div>
            <ModalFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={loading} className="bg-gradient-primary text-white">
                {loading ? "Gerando..." : "Gerar convite"}
              </Button>
            </ModalFooter>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="text-muted-foreground">Convite para</div>
              <div className="font-medium">{email}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Nível inicial: {inviteeType === 'solicitante' ? 'Solicitante' : 'Visitante'} · Expira em {expiresAt ? new Date(expiresAt).toLocaleString("pt-BR") : ""}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link de convite (uso único)</Label>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={share} title="Compartilhar">
                  <Eye className="h-4 w-4" />
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
