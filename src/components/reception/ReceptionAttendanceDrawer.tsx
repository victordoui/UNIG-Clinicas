import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Monitor, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export type ReceptionTicket = { code: string; patient: string };
type Props = { open: boolean; ticket: ReceptionTicket | null; startedAt: number | null; clinicLabel: string; onOpenChange: (open: boolean) => void; onSave: (data: ReceptionDraft) => void | Promise<void>; onFinish: (data: ReceptionDraft) => void | Promise<void> };
export type ReceptionDraft = { reason: string; notes: string; tags: string[]; destination: string; callNext: boolean };

const reasons = ["Primeira consulta", "Avaliação", "Retorno", "Procedimento", "Urgência", "Entrega de exame", "Solicitação de documento", "Atualização cadastral", "Outro"];
const destinations = ["Aguardar triagem", "Aguardar atendimento odontológico", "Encaminhar diretamente ao atendimento", "Retornar para fila", "Atendimento administrativo concluído", "Cancelado", "Outro"];
const availableTags = ["Primeiro atendimento", "Cadastro ok", "Documento entregue", "Prioridade", "Cadastro incompleto", "Documento pendente", "Retorno"];

const formatTime = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function ReceptionAttendanceDrawer({ open, ticket, startedAt, clinicLabel, onOpenChange, onSave, onFinish }: Props) {
  const [now, setNow] = useState(Date.now());
  const [reason, setReason] = useState("Primeira consulta");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>(["Primeiro atendimento"]);
  const [destination, setDestination] = useState("Aguardar triagem");
  const [callNext, setCallNext] = useState(true);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const elapsed = useMemo(() => startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0, [now, startedAt]);
  const draft = (): ReceptionDraft => ({ reason, notes, tags, destination, callNext });
  const dirty = notes.length > 0 || reason !== "Primeira consulta" || destination !== "Aguardar triagem" || tags.length !== 1 || !callNext;

  useEffect(() => {
    if (!open || !startedAt) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [open, startedAt]);

  const close = () => dirty ? setConfirmDiscard(true) : onOpenChange(false);
  const save = async () => { setSaving(true); setRequestError(null); try { await onSave(draft()); } catch { setRequestError("Não foi possível salvar o andamento. Tente novamente."); } finally { setSaving(false); } };
  const finish = async () => { setFinishing(true); setRequestError(null); try { await onFinish(draft()); setConfirmFinish(false); } catch { setRequestError("Não foi possível encerrar o atendimento. Tente novamente."); } finally { setFinishing(false); } };

  return <>
    <Sheet open={open} onOpenChange={(value) => value ? onOpenChange(true) : close()}>
      <SheetContent side="right" className="flex h-dvh w-full flex-col gap-0 overflow-hidden border-l bg-[#f6faf9] p-0 sm:w-[clamp(620px,42vw,760px)] sm:max-w-none">
        <SheetHeader className="shrink-0 border-b bg-white px-7 py-6 pr-14">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><UserRound className="h-6 w-6" /></span><div><SheetTitle className="text-xl font-black text-[#142826]">Atendimento da recepção</SheetTitle><SheetDescription>{clinicLabel}</SheetDescription></div></div>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-7 py-6">
          <section className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-bold tracking-wide text-slate-500">SENHA</p><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2"><strong className="text-5xl font-black text-[#01413d]">{ticket?.code ?? "—"}</strong><span className="border-l pl-4 text-xl font-bold text-[#142826]">{ticket?.patient ?? "Paciente"}</span><span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">● Em atendimento</span></div><p className="mt-3 text-sm text-slate-500">Prontuário 102458 &nbsp;·&nbsp; Convênio UNIG<br />Nascimento: 12/06/1990</p></section>
          <section className="grid grid-cols-[1.2fr_repeat(3,.8fr)] overflow-hidden rounded-2xl border bg-white text-sm shadow-sm"><div className="bg-emerald-50 p-4"><span className="flex items-center gap-2 font-semibold text-emerald-800"><Clock3 className="h-4 w-4" />TEMPO</span><strong className="mt-1 block text-3xl text-[#01413d]">{formatTime(elapsed)}</strong></div><div className="p-4"><span className="text-slate-500">Iniciado por</span><strong className="mt-1 block">Gisele</strong></div><div className="p-4"><span className="text-slate-500">Computador</span><strong className="mt-1 flex items-center gap-1"><Monitor className="h-4 w-4" />PC 05</strong></div><div className="p-4"><span className="text-slate-500">Iniciado às</span><strong className="mt-1 block">{startedAt ? new Date(startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong></div></section>
          <div className="space-y-2"><Label>Motivo do atendimento</Label><Select value={reason} onValueChange={setReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{reasons.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="reception-notes">Observações da recepção</Label><Textarea id="reception-notes" maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Registre apenas informações administrativas e operacionais." className="min-h-28 resize-none" /><p className="text-right text-xs text-slate-500">{notes.length}/500</p></div>
          <fieldset><legend className="mb-3 text-sm font-medium">Marcadores rápidos</legend><div className="flex flex-wrap gap-2">{availableTags.map(tag => <button key={tag} type="button" onClick={() => setTags(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag])} className={`rounded-full border px-3 py-2 text-sm font-medium transition ${tags.includes(tag) ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"}`}>{tag}</button>)}</div></fieldset>
          <div className="space-y-2"><Label>Próximo destino</Label><Select value={destination} onValueChange={setDestination}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{destinations.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4"><Checkbox checked={callNext} onCheckedChange={value => setCallNext(value === true)} /><span><span className="block text-sm font-medium">Chamar próxima senha automaticamente</span><span className="mt-1 block text-xs text-slate-500">Ao encerrar, o sistema chamará o próximo paciente da fila.</span></span></label>
          {requestError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{requestError}</p>}
        </div>
        <footer className="grid shrink-0 gap-3 border-t bg-white p-5 sm:grid-cols-2"><Button variant="outline" className="h-12 border-emerald-600 text-emerald-800" disabled={saving || finishing} onClick={save}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar andamento"}</Button><Button className="h-12 bg-[#0a736b] hover:bg-[#01413d]" disabled={saving || finishing} onClick={() => setConfirmFinish(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Encerrar atendimento</Button></footer>
      </SheetContent>
    </Sheet>
    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Existem alterações não salvas.</AlertDialogTitle><AlertDialogDescription>Fechar o painel não encerra o atendimento, mas descarta os campos ainda não salvos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Continuar editando</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmDiscard(false); onOpenChange(false); }}>Descartar alterações</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Encerrar atendimento da recepção?</AlertDialogTitle><AlertDialogDescription><strong>{ticket?.patient}</strong> · Senha {ticket?.code}<br />Tempo de atendimento: {formatTime(elapsed)}<br />Próximo destino: {destination}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={finishing}>Voltar</AlertDialogCancel><AlertDialogAction disabled={finishing} onClick={(event) => { event.preventDefault(); void finish(); }}>{finishing ? "Encerrando..." : "Confirmar encerramento"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
