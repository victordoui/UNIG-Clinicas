import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Megaphone, Pencil, Play, Plus, Send, Trash2, UploadCloud } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CampaignArtwork } from "@/components/care/CampaignArtwork";
import { validateCampaignMedia, type CampaignMedia } from "@/lib/campaignMedia";

type DisplayMode = "integrated" | "fullscreen";
type MediaFit = "cover" | "contain";
type Campaign = { id: string; organization_id: string; title: string; message: string; media_url: string | null; media_type: string; status: string; display_seconds: number; display_mode: DisplayMode; media_fit: MediaFit };
const bucket = () => supabase.storage.from("tv-campaigns");
const errorMessage = (error: unknown) => error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Tente novamente.";

function FormatCard({ mode, value, onChange, media, title, message, fit }: {
  mode: DisplayMode; value: DisplayMode; onChange: (mode: DisplayMode) => void;
  media: CampaignMedia | null; title: string; message: string; fit: MediaFit;
}) {
  const integrated = mode === "integrated";
  return <button type="button" aria-pressed={mode === value} onClick={() => onChange(mode)} className={`overflow-hidden rounded-xl border p-3 text-left transition ${mode === value ? "border-primary bg-primary/5 ring-2 ring-primary" : "hover:border-primary/50"}`}>
    <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-[#003e3a] text-white" style={{ containerType: "inline-size" }}>
      {integrated && <div className="flex h-[15%] items-center justify-between px-3 text-[2.2cqw] font-bold"><span>UNIG Clínicas · PAINEL DE CHAMADA</span><span>10:30</span></div>}
      <div className={integrated ? "relative mx-[3%] h-[70%] overflow-hidden rounded-md" : "relative h-full"}>
        <CampaignArtwork mediaUrl={media?.url} mediaType={media?.type} title={title} message={message} fit={fit} />
      </div>
      {integrated && <div className="flex h-[15%] items-center px-3 text-[2cqw]">UNIG Clínicas · Saúde, Ensino e Vida Real</div>}
    </div>
    <div className="flex items-center justify-between font-semibold"><span>{integrated ? "Modelo Integrado" : "Modelo Imersivo"}</span>{mode === value && <Check className="h-4 w-4" />}</div>
    <p className="mt-1 text-xs text-muted-foreground">{integrated ? "Mantém o cabeçalho e o rodapé do painel." : "A inserção ocupa toda a tela da TV."}</p>
  </button>;
}

export default function PainelTVCampanhas() {
  const { user, unigRole, activeClinicCode } = useAuth();
  const editable = ["super_admin", "administrador", "gestor_unidade"].includes(unigRole);
  const [rows, setRows] = useState<Campaign[]>([]);
  const [gallery, setGallery] = useState<CampaignMedia[]>([]);
  const [selected, setSelected] = useState<CampaignMedia | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("integrated");
  const [mediaFit, setMediaFit] = useState<MediaFit>("contain");
  const [seconds, setSeconds] = useState(12);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);

  const load = async () => {
    const { data, error } = await supabase.from("tv_campaigns" as any).select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar campanhas", description: error.message, variant: "destructive" });
    else setRows((data ?? []) as unknown as Campaign[]);
    setLoading(false);
  };
  const loadGallery = async () => {
    if (!user) return;
    const assets: CampaignMedia[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket().list(user.id, { limit: 100, offset, sortBy: { column: "created_at", order: "desc" } });
      if (error) { toast({ title: "Não foi possível carregar suas mídias", description: error.message, variant: "destructive" }); return; }
      for (const file of data ?? []) if (file.id) assets.push({ url: bucket().getPublicUrl(`${user.id}/${file.name}`).data.publicUrl, name: file.name.replace(/^[0-9a-f-]{36}-/, ""), type: /\.(mp4|webm)$/i.test(file.name) ? "video" : "image" });
      if (!data || data.length < 100) break;
    }
    setGallery(current => [...new Map([...assets, ...current].map(asset => [asset.url, asset])).values()]);
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadGallery(); }, [user?.id]);
  const library = [...new Map([...gallery, ...rows.filter(row => row.media_url).map(row => ({ url: row.media_url!, name: row.title, type: row.media_type as "image" | "video" }))].map(asset => [asset.url, asset])).values()];
  const reset = () => { setTitle(""); setMessage(""); setSelected(null); setSeconds(12); setDisplayMode("integrated"); setMediaFit("contain"); setEditing(null); setFormError(""); setUploadStatus(""); setOpen(false); };

  const upload = async (files: File[]) => {
    if (!user || uploadLock.current || !editable || busy || !files.length) return;
    uploadLock.current = true; setUploading(true); setFormError("");
    try {
      for (const [index, file] of files.entries()) {
        setUploadStatus(`Enviando ${index + 1} de ${files.length}: ${file.name}`);
        const type = await validateCampaignMedia(file);
        const name = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${user.id}/${crypto.randomUUID()}-${name}`;
        const { error } = await bucket().upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const asset = { url: bucket().getPublicUrl(path).data.publicUrl, name: file.name, type };
        setGallery(current => [asset, ...current]); setSelected(asset);
      }
      setUploadStatus(`${files.length} arquivo(s) salvo(s) na biblioteca. Selecione a mídia que deseja usar.`);
    } catch (error) { setFormError(errorMessage(error)); setUploadStatus("Envio interrompido. Os arquivos já enviados permanecem na biblioteca."); }
    finally { uploadLock.current = false; setUploading(false); if (fileInput.current) fileInput.current.value = ""; }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy || uploadLock.current || !user) return;
    setBusy("save"); setFormError("");
    try {
      const content = { title: title.trim(), message: message.trim(), media_url: selected?.url ?? null, media_type: selected?.type ?? "text", display_seconds: seconds, display_mode: displayMode, media_fit: mediaFit };
      if (content.title.length < 3 || content.message.length < 3) throw new Error("Preencha título e descrição com pelo menos 3 caracteres.");
      if (!Number.isInteger(seconds) || seconds < 5 || seconds > 60) throw new Error("A duração deve ser entre 5 e 60 segundos.");
      if (editing) {
        const { error } = await (supabase.rpc as any)("update_tv_campaign_content", { target_campaign_id: editing.id, content });
        if (error?.code === "PGRST202") {
          const fallback = await (supabase.from("tv_campaigns" as any) as any).update({ ...content, updated_by: user.id }).eq("id", editing.id).select("id");
          if (fallback.error || !fallback.data?.length) throw new Error("A atualização do banco para editar campanhas de outros gestores ainda precisa ser aplicada. Seus dados continuam neste formulário.");
        } else if (error) throw error;
      } else {
        if (!activeClinicCode) throw new Error("Selecione a clínica antes de salvar a inserção.");
        const { data: clinic, error: clinicError } = await supabase.from("clinics").select("organization_id").eq("code", activeClinicCode).single();
        if (clinicError || !clinic) throw clinicError ?? new Error("Clínica não encontrada.");
        const { error } = await supabase.from("tv_campaigns" as any).insert({ ...content, organization_id: clinic.organization_id, status: "draft", created_by: user.id, updated_by: user.id });
        if (error) throw error;
      }
      toast({ title: editing ? "Campanha atualizada" : "Rascunho salvo. Clique em Publicar para exibir na TV." });
      reset(); await load();
    } catch (error) { setFormError(errorMessage(error)); }
    finally { setBusy(null); }
  };
  const publish = async (item: Campaign) => {
    if (busy) return; setBusy(item.id);
    try {
      const { error } = await (supabase.rpc as any)("set_tv_campaign_publication", { target_campaign_id: item.id, target_status: item.status === "published" ? "draft" : "published" });
      if (error) throw error;
      toast({ title: item.status === "published" ? "Campanha retirada do painel" : "Campanha publicada" }); await load();
    } catch (error) { toast({ title: "Não foi possível publicar", description: errorMessage(error), variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const edit = (item: Campaign) => {
    reset(); setEditing(item); setTitle(item.title); setMessage(item.message); setDisplayMode(item.display_mode ?? "integrated"); setMediaFit(item.media_fit ?? "cover"); setSeconds(item.display_seconds);
    setSelected(item.media_url ? { url: item.media_url, name: item.title, type: item.media_type as "image" | "video" } : null); setOpen(true);
  };
  const remove = async (item: Campaign) => {
    if (busy || !window.confirm(`Excluir a inserção “${item.title}”? A mídia permanece na sua biblioteca.`)) return;
    setBusy(item.id);
    try {
      const { data, error } = await supabase.from("tv_campaigns" as any).delete().eq("id", item.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Você não tem permissão para excluir esta inserção.");
      await load();
    } catch (error) { toast({ title: "Não foi possível excluir", description: errorMessage(error), variant: "destructive" }); }
    finally { setBusy(null); }
  };
  return <MainLayout><div className="space-y-5">
    <section className="rounded-3xl bg-gradient-to-br from-primary to-teal-700 px-6 py-7 text-primary-foreground"><Megaphone className="h-5 w-5" /><h1 className="mt-2 text-3xl font-extrabold">Campanhas para o Painel TV</h1><p>Envie sua mídia, confira o formato e publique na TV.</p></section>
    {editable && !open && <Button onClick={() => { reset(); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nova inserção</Button>}
    {open && <Card><CardContent className="p-5 sm:p-6"><form onSubmit={save} className="space-y-6">
      <h2 className="text-xl font-bold">{editing ? "Editar inserção" : "Nova inserção"}</h2>
      <fieldset disabled={uploading || Boolean(busy)} className="space-y-4 disabled:opacity-70">
        <legend className="mb-3 text-lg font-semibold">1. Envie ou escolha sua mídia</legend>
        <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(Array.from(event.dataTransfer.files)); }} className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
          <UploadCloud className="mx-auto mb-3 h-9 w-9 text-primary" /><p className="font-medium">Arraste suas imagens aqui ou escolha os arquivos</p><p className="mt-1 text-sm text-muted-foreground">JPG, PNG, WEBP, MP4 ou WebM · até 30 MB por arquivo · vários arquivos por envio</p>
          <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" aria-label="Enviar mídias" className="sr-only" onChange={event => void upload(Array.from(event.target.files ?? []))} />
          <Button type="button" className="mt-4" onClick={() => fileInput.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Selecionar arquivos</Button>
        </div>
        <div><p className="font-semibold">Biblioteca de mídias <span className="text-sm font-normal text-muted-foreground">({library.length} salvas)</span></p><p className="mb-3 text-sm text-muted-foreground">Seus uploads ficam disponíveis para novas inserções, mesmo ao cancelar o formulário.</p>
          <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto p-1 lg:grid-cols-4">
            {library.map(asset => <button key={asset.url} type="button" aria-pressed={selected?.url === asset.url} aria-label={`Usar ${asset.name}`} onClick={() => setSelected(asset)} className={`relative overflow-hidden rounded-lg border text-left ${selected?.url === asset.url ? "ring-2 ring-primary" : "hover:border-primary"}`}>
              {asset.type === "video" ? <video src={asset.url} muted playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" /> : <img src={asset.url} alt={asset.name} loading="lazy" className="aspect-video w-full bg-slate-100 object-contain" />}
              {selected?.url === asset.url && <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-white"><Check className="h-4 w-4" /></span>}<span className="block truncate p-2 text-xs">{asset.name}</span>
            </button>)}
            {Array.from({ length: Math.max(0, 4 - library.length) }, (_, index) => <button type="button" key={index} onClick={() => fileInput.current?.click()} aria-label="Adicionar mídia à biblioteca" className="grid aspect-video place-content-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"><Plus className="mx-auto h-5 w-5" />Adicionar mídia</button>)}
          </div>
          {selected && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className="min-w-0 break-all">Selecionada: {selected.name}</span><Button variant="ghost" size="sm" type="button" onClick={() => setSelected(null)}>Usar somente texto</Button></div>}
        </div>
      </fieldset>
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">{uploading && <Loader2 className="h-4 w-4 animate-spin" />}{uploadStatus}</div>
      <fieldset disabled={Boolean(busy)} className="space-y-4">
        <legend className="mb-3 text-lg font-semibold">2. Conteúdo da inserção</legend>
        <div className="space-y-2"><Label htmlFor="campaign-title">Título</Label><Input id="campaign-title" value={title} onChange={event => setTitle(event.target.value)} required minLength={3} maxLength={100} placeholder="Ex.: Cuide do seu sorriso" /></div>
        <div className="space-y-2"><Label htmlFor="campaign-message">Descrição exibida na TV</Label><Textarea id="campaign-message" value={message} onChange={event => setMessage(event.target.value)} required minLength={3} maxLength={280} placeholder="Escreva a mensagem da campanha" /><p className="text-right text-xs text-muted-foreground">{message.length}/280</p></div>
      </fieldset>
      <fieldset disabled={Boolean(busy)} className="space-y-4">
        <legend className="mb-3 text-lg font-semibold">3. Veja como ficará e escolha o formato</legend>
        <div className="grid gap-4 md:grid-cols-2">{(["integrated", "fullscreen"] as const).map(mode => <FormatCard key={mode} mode={mode} value={displayMode} onChange={setDisplayMode} media={selected} title={title} message={message} fit={mediaFit} />)}</div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="campaign-fit">Enquadramento da mídia</Label><select id="campaign-fit" value={mediaFit} onChange={event => setMediaFit(event.target.value as MediaFit)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="contain">Mostrar inteira (sem cortar)</option><option value="cover">Preencher a tela (pode cortar bordas)</option></select></div><div className="space-y-2"><Label htmlFor="campaign-seconds">Duração na TV (segundos)</Label><Input id="campaign-seconds" type="number" min={5} max={60} step={1} required value={seconds} onChange={event => setSeconds(Number(event.target.value))} /><p className="text-xs text-muted-foreground">De 5 a 60 segundos. Vídeos repetem durante esse período.</p></div></div>
      </fieldset>
      {formError && <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{formError}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={uploading || Boolean(busy)}>{busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Salvar alterações" : "Salvar rascunho"}</Button><Button type="button" variant="outline" disabled={uploading || Boolean(busy)} onClick={reset}>Cancelar</Button></div>
    </form></CardContent></Card>}
    <section className="space-y-3" aria-label="Inserções salvas">{loading && <p>Carregando inserções…</p>}{!loading && rows.length === 0 && <p className="rounded-xl border p-6 text-muted-foreground">Nenhuma inserção ainda. Crie a primeira campanha para sua TV.</p>}{rows.map(item => <Card key={item.id}><CardContent className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{item.title}</b><Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status === "published" ? "Publicada" : item.status === "draft" ? "Rascunho" : item.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.display_mode === "fullscreen" ? "Modelo Imersivo · Tela cheia" : "Modelo Integrado"} · {item.display_seconds}s</p></div>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => window.open(`/painel-tv?testCampaign=${encodeURIComponent(item.id)}&mode=${item.display_mode}`, "_blank", "noopener,noreferrer")}><Play className="mr-2 h-4 w-4" />Testar na TV</Button>{editable && <><Button size="sm" variant="outline" disabled={Boolean(busy) || uploading} onClick={() => edit(item)}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button size="sm" variant="destructive" disabled={Boolean(busy) || uploading} onClick={() => void remove(item)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button><Button size="sm" disabled={Boolean(busy) || uploading} onClick={() => void publish(item)}><Send className="mr-2 h-4 w-4" />{item.status === "published" ? "Retirar" : "Publicar"}</Button></>}</div>
    </CardContent></Card>)}</section>
  </div></MainLayout>;
}
