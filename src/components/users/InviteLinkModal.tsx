import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ASSIGNABLE_UNIG_ROLES, UNIG_ROLE_LABEL } from "@/lib/unigRoles";
import { Copy, Check, Link as LinkIcon } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteCreated?: () => void;
}

export function InviteLinkModal({ open, onOpenChange, onInviteCreated }: Props) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("solicitante");
  const [days, setDays] = useState<string>("2");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail(""); setRole("solicitante"); setDays("2");
    setInviteUrl(null); setExpiresAt(null); setCopied(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleGenerate = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }
    if (!organization?.organization_id) {
      toast({ title: "Organização não identificada", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Sessão expirada", description: "Recarregue a página.", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-invitation", {
        body: {
          email: cleanEmail,
          role,
          organization_id: organization.organization_id,
          expires_in_days: Number(days),
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar convite");

      // Garante origin do navegador (edge function pode receber origin sem subdomínio correto)
      const url = `${window.location.origin}/aceitar-convite/${data.token}`;
      setInviteUrl(url);
      setExpiresAt(data.expires_at);
      toast({ title: "Link de convite gerado", description: "Copie e envie para o convidado." });
      onInviteCreated?.();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
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

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Gerar link de convite
          </ModalTitle>
          <ModalDescription>
            Link de uso único, vinculado ao e-mail informado. O convidado define a senha ao aceitar.
          </ModalDescription>
        </ModalHeader>

        {!inviteUrl ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail do convidado *</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="convidado@empresa.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Nível de acesso *</Label>
              <Select value={role} onValueChange={setRole} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_UNIG_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{UNIG_ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Validade do link</Label>
              <RadioGroup value={days} onValueChange={setDays} className="flex gap-4" disabled={loading}>
                {["1", "2", "3"].map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <RadioGroupItem value={d} id={`d-${d}`} />
                    <Label htmlFor={`d-${d}`} className="font-normal cursor-pointer">
                      {d} {d === "1" ? "dia" : "dias"}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={loading} className="bg-gradient-primary text-white">
                {loading ? "Gerando..." : "Gerar link"}
              </Button>
            </ModalFooter>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="text-muted-foreground">Convite para</div>
              <div className="font-medium">{email}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Papel: {UNIG_ROLE_LABEL[role as keyof typeof UNIG_ROLE_LABEL]} · Expira em{" "}
                {expiresAt ? new Date(expiresAt).toLocaleString("pt-BR") : ""}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link de convite</Label>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar">
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie este link ao convidado. É de uso único e expira na data acima.
              </p>
            </div>

            <ModalFooter>
              <Button variant="outline" onClick={() => { reset(); }}>
                Gerar outro
              </Button>
              <Button onClick={() => handleClose(false)} className="bg-gradient-primary text-white">
                Concluir
              </Button>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
