import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Camera, Loader2, Mail, Save, ShieldCheck } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { UNIG_ROLE_LABEL } from "@/lib/unigRoles";
import { toast } from "@/hooks/use-toast";

export default function Perfil() {
  const { user, profile, unigRole, clinicCodes, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const initials = useMemo(() => (fullName || profile?.email || "U").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(), [fullName, profile?.email]);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setJobTitle((profile as any)?.job_title ?? "");
    setBio((profile as any)?.bio ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem inválida", description: "Envie JPG, PNG ou WEBP de até 5 MB.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      toast({ title: "Foto enviada", description: "Clique em Salvar perfil para confirmar a alteração." });
    } catch (error: any) {
      toast({ title: "Não foi possível enviar a foto", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const save = async () => {
    if (!user || fullName.trim().length < 3) {
      toast({ title: "Informe seu nome completo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase.from('profiles') as any).update({ full_name: fullName.trim(), job_title: jobTitle.trim() || null, bio: bio.trim() || null, avatar_url: avatarUrl }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Perfil atualizado" });
    } catch (error: any) {
      toast({ title: "Não foi possível salvar o perfil", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return <MainLayout><div className="mx-auto max-w-4xl space-y-5">
    <section><h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1><p className="mt-1 text-sm text-muted-foreground">Atualize sua apresentação para que sua identidade apareça corretamente no sistema.</p></section>
    <div className="grid gap-5 md:grid-cols-[250px_1fr]">
      <Card className="h-fit"><CardContent className="flex flex-col items-center p-6 text-center">
        <div className="relative"><Avatar className="h-28 w-28 ring-4 ring-primary/10"><AvatarImage src={avatarUrl ?? undefined} alt={fullName || 'Foto do perfil'} /><AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">{initials}</AvatarFallback></Avatar>
          <Label htmlFor="avatar" className="absolute bottom-0 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-md"><Camera className="h-4 w-4" /><span className="sr-only">Alterar foto</span></Label>
        </div><Input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadAvatar} />
        <h2 className="mt-4 font-bold">{fullName || 'Seu nome'}</h2><p className="mt-1 text-sm text-muted-foreground">{UNIG_ROLE_LABEL[unigRole]}</p>
        <div className="mt-5 w-full rounded-xl bg-muted px-3 py-2 text-left text-xs text-muted-foreground"><p className="font-semibold text-foreground">Acesso às clínicas</p><p className="mt-1">{clinicCodes.length ? clinicCodes.join(' · ') : 'Institucional'}</p></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Informações profissionais</CardTitle><CardDescription>Seu e-mail e função são administrados pela instituição.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Nome completo</Label><Input id="name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} /></div><div className="space-y-2"><Label htmlFor="title">Cargo ou apresentação</Label><Input id="title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={100} placeholder="Ex.: Recepção clínica" /></div></div>
        <div className="space-y-2"><Label htmlFor="bio">Sobre você</Label><Textarea id="bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} placeholder="Uma apresentação curta para a equipe." /><p className="text-right text-xs text-muted-foreground">{bio.length}/280</p></div>
        <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /><span className="truncate">{profile?.email}</span><ShieldCheck className="ml-auto h-4 w-4 text-primary" /></div>
        <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar perfil</Button></div>
      </CardContent></Card>
    </div>
  </div></MainLayout>;
}
