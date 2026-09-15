import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Megaphone, MonitorPlay, Pencil, Play, Plus, Send, Trash2, Tv } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type DisplayMode = "integrated" | "fullscreen";
type MediaFit = "cover" | "contain";
type Campaign = { id: string; title: string; message: string; media_url: string | null; media_type: string; status: string; display_seconds: number; display_mode: DisplayMode; media_fit: MediaFit };
const editableRole = (role: string) => ["super_admin", "administrador", "gestor_unidade"].includes(role);
const missingDisplayColumns = (error: { code?: string; message?: string } | null) => error?.code === "42703" || Boolean(error?.message?.includes("display_mode"));
const validMedia = (file: File) => /\.(jpe?g|png|webp|mp4|webm)$/i.test(file.name) && file.size <= 30 * 1024 * 1024;
const safeFileName = (file: File) => file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");

function FormatCard({ mode, value, onChange }: { mode: DisplayMode; value: DisplayMode; onChange: (mode: DisplayMode) => void }) {
  const integrated = mode === "integrated"; const selected = mode === value;
  return <button type="button" onClick={() => onChange(mode)} className={`relative rounded-xl border p-3 text-left ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"}`}>
    {selected && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}<div className={`mb-3 aspect-video rounded-lg ${integrated ? "bg-[#01413D] p-2" : "grid place-items-center bg-gradient-to-br from-[#01413D] to-[#08A899]"}`}>
      {integrated ? <><div className="flex justify-between text-[7px] text-white"><span>UNIG · INSERÇÃO</span><span>10:30</span></div><div className="mt-2 grid h-10 place-items-center rounded bg-white text-[9px] font-bold text-[#01413D]">CAMPANHA</div><p className="mt-1 text-[6px] text-white">Painel retorna em instantes</p></> : <span className="text-center text-[10px] font-black text-white">CAMPANHA<br />TELA CHEIA</span>}
    </div><p className="font-semibold">{integrated ? "Modelo Integrado" : "Modelo Imersivo"}</p><p className="text-xs text-muted-foreground">{integrated ? "Com identidade do painel" : "Tela cheia"}</p>
  </button>;
}

export default function PainelTVCampanhas() {
  const { user, unigRole } = useAuth(); const editable = editableRole(unigRole);
  const [rows, setRows] = useState<Campaign[]>([]); const [title, setTitle] = useState(""); const [message, setMessage] = useState(""); const [media, setMedia] = useState<File | null>(null); const [displayMode, setDisplayMode] = useState<DisplayMode>("integrated"); const [mediaFit, setMediaFit] = useState<MediaFit>("cover"); const [seconds, setSeconds] = useState(12); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Campaign | null>(null);
  const load = async () => { let result = await (supabase.from("tv_campaigns" as any) as any).select("id,title,message,media_url,media_type,status,display_seconds,display_mode,media_fit").order("created_at", { ascending: false }); if (missingDisplayColumns(result.error)) result = await (supabase.from("tv_campaigns" as any) as any).select("id,title,message,media_url,media_type,status,display_seconds").order("created_at", { ascending: false }); if (result.error) toast({ title: "Erro ao carregar campanhas", description: result.error.message, variant: "destructive" }); else setRows((result.data ?? []).map((item: any) => ({ ...item, display_mode: item.display_mode ?? "integrated", media_fit: item.media_fit ?? "cover" }))); };
  useEffect(() => { void load(); }, []);
  const closeForm = () => { setTitle(""); setMessage(""); setMedia(null); setSeconds(12); setDisplayMode("integrated"); setMediaFit("cover"); setEditing(null); setOpen(false); };
  const save = async (event: FormEvent) => { event.preventDefault(); try { const { data: role } = await (supabase.from("user_roles") as any).select("organization_id").eq("user_id", user?.id).eq("is_active", true).limit(1).maybeSingle(); let media_url = editing?.media_url ?? null; let media_type = editing?.media_type ?? "text"; if (media && user) { if (!validMedia(media)) throw new Error("Envie JPG, PNG, WEBP, MP4 ou WebM de até 30 MB."); const path = `${user.id}/${crypto.randomUUID()}-${safeFileName(media)}`; const { error: uploadError } = await supabase.storage.from("tv-campaigns").upload(path, media, { contentType: media.type || undefined }); if (uploadError) throw uploadError; media_url = supabase.storage.from("tv-campaigns").getPublicUrl(path).data.publicUrl; media_type = /\.(mp4|webm)$/i.test(media.name) ? "video" : "image"; } const base = { organization_id: role?.organization_id, title, message, media_url, media_type, display_seconds: seconds, updated_by: user?.id }; const formatted = { ...base, display_mode: displayMode, media_fit: mediaFit }; let result = editing ? await (supabase.from("tv_campaigns" as any) as any).update(formatted).eq("id", editing.id) : await (supabase.from("tv_campaigns" as any) as any).insert({ ...formatted, status: "draft", created_by: user?.id }); if (missingDisplayColumns(result.error)) result = editing ? await (supabase.from("tv_campaigns" as any) as any).update(base).eq("id", editing.id) : await (supabase.from("tv_campaigns" as any) as any).insert({ ...base, status: "draft", created_by: user?.id }); if (result.error) throw result.error; closeForm(); toast({ title: editing ? "Campanha atualizada" : "Campanha salva como rascunho" }); void load(); } catch (error: any) { toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" }); } };
  const publish = async (item: Campaign) => {
    const targetStatus = item.status === "published" ? "draft" : "published";
    const { error } = await (supabase.rpc as any)("set_tv_campaign_publication", {
      target_campaign_id: item.id,
      target_status: targetStatus,
    });
    if (error) toast({ title: "Não foi possível publicar", description: error.message, variant: "destructive" });
    else { toast({ title: targetStatus === "draft" ? "Campanha retirada do painel" : "Campanha publicada" }); void load(); }
  };
  const edit = (item: Campaign) => { setEditing(item); setTitle(item.title); setMessage(item.message); setDisplayMode(item.display_mode); setMediaFit(item.media_fit); setSeconds(item.display_seconds); setMedia(null); setOpen(true); };
  const remove = async (item: Campaign) => { if (!window.confirm(`Excluir a inserção “${item.title}”? Esta ação não pode ser desfeita.`)) return; const { error } = await (supabase.from("tv_campaigns" as any) as any).delete().eq("id", item.id); if (error) toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" }); else { toast({ title: "Inserção excluída" }); void load(); } };
  const test = (item: Campaign) => window.open(`/painel-tv?testCampaign=${encodeURIComponent(item.id)}&mode=${item.display_mode}`, "_blank", "noopener,noreferrer"); const preview = rows.find((row) => row.status === "published") ?? rows[0];
  return <MainLayout><div className="space-y-5"><section className="rounded-3xl bg-gradient-to-br from-primary to-teal-700 px-6 py-7 text-primary-foreground"><Megaphone className="h-5 w-5" /><h1 className="mt-2 text-3xl font-extrabold">Campanhas para o Painel TV</h1><p>Gerencie inserções e formatos de exibição.</p></section>{editable && <Button onClick={() => { closeForm(); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nova inserção</Button>}{open && <Card><CardContent className="p-5"><form onSubmit={save} className="space-y-3"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" required /><Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Descrição" required /><div className="grid grid-cols-2 gap-3"><FormatCard mode="integrated" value={displayMode} onChange={setDisplayMode} /><FormatCard mode="fullscreen" value={displayMode} onChange={setDisplayMode} /></div><Input type="number" min={5} max={60} value={seconds} onChange={e => setSeconds(Number(e.target.value))} /><Input type="file" onChange={(e: ChangeEvent<HTMLInputElement>) => setMedia(e.target.files?.[0] ?? null)} /><Button type="submit">{editing ? "Salvar alterações" : "Salvar rascunho"}</Button><Button type="button" variant="ghost" onClick={closeForm}>Cancelar</Button></form></CardContent></Card>}<section className="space-y-3">{rows.map(item => <Card key={item.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><b>{item.title}</b><p className="text-sm text-muted-foreground">{item.display_mode === "fullscreen" ? "Modelo Imersivo · Tela cheia" : "Modelo Integrado"} · {item.display_seconds}s</p></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => test(item)}><Play className="mr-2 h-4 w-4" />Testar</Button>{editable && <><Button size="sm" variant="outline" onClick={() => edit(item)}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button size="sm" variant="destructive" onClick={() => void remove(item)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button><Button size="sm" onClick={() => void publish(item)}><Send className="mr-2 h-4 w-4" />{item.status === "published" ? "Retirar" : "Publicar"}</Button></>}</div></CardContent></Card>)}</section></div></MainLayout>;
}
