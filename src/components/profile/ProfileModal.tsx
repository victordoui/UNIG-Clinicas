import { useState, useEffect } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Save, X, Upload, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatPhoneBR, onlyLetters } from "@/lib/masks";
import { AvatarCropper } from "./AvatarCropper";
import { RoleBadge } from "@/components/users/RoleBadge";
import { mapDbRoleToUnig } from "@/lib/unigRoles";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      {children}
    </h3>
  );
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { profile, user, refreshProfile, currentRole, isSuperAdmin, supplierLink, isCouncilMember } = useAuth() as any;
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    full_name: "",
    nickname: "",
    email: "",
    institutional_email: "",
    avatar_url: "",
    department: "",
    registration: "",
    whatsapp: "",
    job_role: "",
    birth_date: "",
  });

  useEffect(() => {
    if (profile && open) {
      const p = profile as any;
      setFormData({
        full_name: p.full_name || "",
        nickname: p.nickname || "",
        email: p.email || "",
        institutional_email: p.institutional_email || "",
        avatar_url: p.avatar_url || "",
        department: p.department || "",
        registration: p.registration || "",
        whatsapp: p.whatsapp || "",
        job_role: p.job_role || "",
        birth_date: p.birth_date || "",
      });
    }
  }, [profile, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const payload: any = {
        full_name: formData.full_name,
        nickname: formData.nickname || null,
        email: formData.email,
        institutional_email: formData.institutional_email || null,
        avatar_url: formData.avatar_url || null,
        department: formData.department || null,
        registration: formData.registration || null,
        whatsapp: formData.whatsapp || null,
        job_role: formData.job_role || null,
        birth_date: formData.birth_date || null,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) {
        toast({ title: "Erro ao atualizar perfil", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
      await refreshProfile();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro interno", description: error?.message || "Falha ao atualizar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPickedImage(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropperOpen(false);
    setPickedImage(null);
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const fileName = `${user.id}/avatar.jpg`;
      await supabase.storage.from("avatars").remove([fileName]);
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: cacheBustedUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setFormData((prev) => ({ ...prev, avatar_url: cacheBustedUrl }));
      await refreshProfile();
      toast({ title: "Foto atualizada", description: "Sua nova foto de perfil já está ativa." });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error?.message || "Não foi possível salvar a foto.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "gerente": return "Gerente";
      case "usuario": return "Usuário";
      default: return role || "Usuário";
    }
  };

  const initials = (formData.nickname || formData.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        className="sm:max-w-2xl"
        title={
          <span className="flex items-center gap-2">
            <User className="h-5 w-5" /> Meu Perfil
          </span>
        }
        description="Visualize e edite suas informações pessoais"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="bg-gradient-primary text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
          {/* Foto */}
          <section>
            <SectionTitle>Foto de Perfil</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <Avatar className="w-20 h-20 ring-2 ring-primary/20">
                  <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                >
                  <Camera className="h-5 w-5 text-white" />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePickFile}
                  className="hidden"
                  id="avatar-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  disabled={uploadingAvatar}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAvatar ? "Enviando..." : "Alterar foto"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  JPG, PNG ou WEBP (máx. 5MB). Você poderá recortar antes de salvar.
                </p>
              </div>
            </div>
          </section>

          {/* Identidade */}
          <section>
            <SectionTitle>Identidade</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input id="full_name" value={formData.full_name} onChange={(e) => handleInputChange("full_name", onlyLetters(e.target.value))} placeholder="Seu nome completo" autoCapitalize="words" />
              </div>
              <div>
                <Label htmlFor="nickname">Como gostaria de ser chamado</Label>
                <Input id="nickname" value={formData.nickname} onChange={(e) => handleInputChange("nickname", e.target.value)} placeholder="Ex: João" />
              </div>
              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => handleInputChange("birth_date", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="registration">Matrícula</Label>
                <Input id="registration" value={formData.registration} onChange={(e) => handleInputChange("registration", e.target.value.replace(/\D/g, ""))} placeholder="Apenas números" />
              </div>
            </div>
          </section>

          {/* Trabalho */}
          <section>
            <SectionTitle>Trabalho</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="job_role">Cargo</Label>
                <Input id="job_role" value={formData.job_role} onChange={(e) => handleInputChange("job_role", e.target.value)} placeholder="Ex: Analista" />
              </div>
              <div>
                <Label htmlFor="department">Setor / Departamento</Label>
                <Input id="department" value={formData.department} onChange={(e) => handleInputChange("department", e.target.value)} placeholder="Ex: TI" />
              </div>
              <div className="sm:col-span-2">
                <Label>Perfil de Acesso</Label>
                <div className="mt-1">
                  <RoleBadge
                    role={mapDbRoleToUnig(currentRole as any, !!isSuperAdmin, !!supplierLink, !!isCouncilMember)}
                    size="md"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contato */}
          <section>
            <SectionTitle>Contato</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="whatsapp">Telefone / WhatsApp</Label>
                <Input id="whatsapp" value={formatPhoneBR(formData.whatsapp)} onChange={(e) => handleInputChange("whatsapp", formatPhoneBR(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label htmlFor="email">E-mail Principal *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="seu@email.com" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="institutional_email">E-mail institucional</Label>
                <Input id="institutional_email" type="email" value={formData.institutional_email} onChange={(e) => handleInputChange("institutional_email", e.target.value)} placeholder="nome@instituicao.gov.br" />
              </div>
            </div>
          </section>

          {/* Submit oculto para permitir Enter */}
          <button type="submit" className="hidden" aria-hidden />
        </form>
      </ResponsiveDialog>

      <AvatarCropper
        open={cropperOpen}
        imageSrc={pickedImage}
        onCancel={() => {
          setCropperOpen(false);
          setPickedImage(null);
        }}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
