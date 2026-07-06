import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Send, Bot, User, CheckCircle2, Printer, Upload, Plus, Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubmitCI } from '@/hooks/useCI';
import { useAuth } from '@/hooks/useAuth';
import {
  CI_DESTINATION_SECTORS, getRequestTypesForDestination,
  CI_OTHER_UNIT_VALUE, getItemGuideForRequestType,
  suggestPriorityFromText, type CIPriority,
} from '@/lib/ciLabels';
import { cn } from '@/lib/utils';
import { formatPhoneBR } from '@/lib/masks';
import { useCampuses } from '@/hooks/useCampuses';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';
import { CIBulkItemsModal, type BulkItem } from '@/components/ci/CIBulkItemsModal';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'bot' | 'user'; content: React.ReactNode };
type SerMsg = { role: 'bot' | 'user'; text: string };

interface Identity {
  name: string; registration: string; role: string; sector: string; whatsapp: string;
}

interface ChatItem {
  descricao: string;
  quantidade: number;
  unidade?: string;
  customUnit?: string;
  especificacao?: string;
}

const STORAGE_KEY = 'unigops:ci:identity';
const STATE_KEY_PREFIX = 'unigops:ci:chatbot:state:v2:';

const STEPS = [
  'identidade', 'campus', 'centro_custo', 'destino', 'tipo', 'assunto',
  'itens', 'justificativa', 'urgencia', 'prioridade', 'revisao', 'enviado',
] as const;
type Step = typeof STEPS[number];

const maskWhatsapp = (v: string) => formatPhoneBR(v);

interface Draft {
  campus: string;
  cost_center_id: string | null;
  cost_center: string;
  destination_sector: string;
  request_type: string;
  subject: string;
  justificativa: string;
  urgencia: string;
  priority: CIPriority;
  items: ChatItem[];
}

const EMPTY_DRAFT: Draft = {
  campus: '', cost_center_id: null, cost_center: '',
  destination_sector: '', request_type: '', subject: '',
  justificativa: '', urgencia: '', priority: 'media', items: [],
};

interface Props { channel?: 'chatbot' | 'interno'; createdBy?: string | null }

export function OpsAssistChatbot({ channel = 'chatbot', createdBy }: Props) {
  const submit = useSubmitCI();
  const { profile, organization } = useAuth();
  const { data: campuses = [] } = useCampuses();
  const { data: costCenters = [] } = useMyCostCenters();
  const stateKey = STATE_KEY_PREFIX + channel;

  const restored = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(stateKey);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || s.step === 'enviado') return null;
      return s as {
        step: Step; draft: Draft; identity: Identity;
        identityField: keyof Identity; protocol: string | null; serMessages: SerMsg[];
      };
    } catch { return null; }
  })();

  const initialMsg: SerMsg = { role: 'bot', text: 'Olá 👋 Sou o Ops Assist da UNIG Facilities. Vou ajudar você a abrir sua Requisição de Compra (CI).' };

  const [step, setStep] = useState<Step>(restored?.step ?? 'identidade');
  const [messages, setMessages] = useState<Msg[]>(
    restored
      ? restored.serMessages.map((m) => ({ role: m.role, content: m.text }))
      : [{ role: 'bot', content: (
          <>Olá 👋 Sou o <strong>Ops Assist</strong> da UNIG Facilities. Vou ajudar você a abrir sua <strong>Requisição de Compra (CI)</strong>.</>
        )}]
  );
  const [serMessages, setSerMessages] = useState<SerMsg[]>(restored?.serMessages ?? [initialMsg]);
  const [identity, setIdentity] = useState<Identity>(restored?.identity ?? { name: '', registration: '', role: '', sector: '', whatsapp: '' });
  const [draft, setDraft] = useState<Draft>(restored?.draft ?? EMPTY_DRAFT);
  const [savedIdentity, setSavedIdentity] = useState<Identity | null>(null);
  const [identityField, setIdentityField] = useState<keyof Identity>(restored?.identityField ?? 'name');
  const [input, setInput] = useState('');
  const [protocol, setProtocol] = useState<string | null>(restored?.protocol ?? null);
  const skipInit = !!restored;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Item composer state
  const [itemDraft, setItemDraft] = useState<ChatItem>({ descricao: '', quantidade: 1, unidade: '', especificacao: '' });
  const [bulkOpen, setBulkOpen] = useState(false);

  // Pré-popular a partir do perfil autenticado
  useEffect(() => {
    if (skipInit) return;
    if (!profile) return;
    const fromProfile: Identity = {
      name: profile.full_name || '',
      registration: profile.registration || '',
      role: profile.job_role || '',
      sector: profile.department || '',
      whatsapp: profile.whatsapp || '',
    };
    const complete = !!(fromProfile.name && fromProfile.sector);
    if (complete) {
      setIdentity(fromProfile);
      push('bot', (
        <>Identifiquei seu perfil — <strong>{fromProfile.name.split(' ')[0]}</strong> ({fromProfile.sector}).</>
      ), `Identifiquei seu perfil — ${fromProfile.name.split(' ')[0]} (${fromProfile.sector}).`);
      push('bot', 'Para qual **unidade / campus** é esta requisição?');
      setStep('campus');
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const id = JSON.parse(raw) as Identity;
        setSavedIdentity(id);
        push('bot', (
          <>Encontramos seus dados salvos para <strong>{id.name}</strong>. Deseja continuar com eles?</>
        ), `Encontramos seus dados salvos para ${id.name}. Deseja continuar com eles?`);
      } else {
        push('bot', 'Vamos começar! Qual é o seu nome completo?');
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Persistir estado
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (step === 'enviado') {
        sessionStorage.removeItem(stateKey);
        return;
      }
      sessionStorage.setItem(stateKey, JSON.stringify({
        step, draft, identity, identityField, protocol, serMessages,
      }));
    } catch {}
  }, [step, draft, identity, identityField, protocol, serMessages, stateKey]);

  function push(role: 'bot' | 'user', content: React.ReactNode, textOverride?: string) {
    setMessages((m) => [...m, { role, content }]);
    const text = textOverride ?? (typeof content === 'string' ? content : '');
    setSerMessages((m) => [...m, { role, text }]);
  }

  function persistIdentity(id: Identity) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
  }

  function continueWithSaved() {
    if (!savedIdentity) return;
    setIdentity(savedIdentity);
    setSavedIdentity(null);
    push('user', 'Continuar com meus dados');
    push('bot', `Perfeito, ${savedIdentity.name.split(' ')[0]}! Para qual unidade / campus é esta requisição?`);
    setStep('campus');
  }
  function updateSaved() {
    setSavedIdentity(null);
    push('user', 'Atualizar meus dados');
    push('bot', 'Sem problema. Qual é o seu nome completo?');
    setIdentityField('name');
  }

  function nextIdentityField() {
    const order: (keyof Identity)[] = ['name', 'registration', 'role', 'sector', 'whatsapp'];
    const idx = order.indexOf(identityField);
    const next = order[idx + 1];
    if (next) {
      setIdentityField(next);
      const prompts: Record<keyof Identity, string> = {
        name: 'Qual é o seu nome completo?',
        registration: 'Qual é a sua matrícula?',
        role: 'Qual é o seu cargo?',
        sector: 'Qual é o seu setor?',
        whatsapp: 'Qual é o seu WhatsApp?',
      };
      push('bot', prompts[next]);
    } else {
      persistIdentity(identity);
      push('bot', `Obrigado, ${identity.name.split(' ')[0]}! Para qual unidade / campus é esta requisição?`);
      setStep('campus');
    }
  }

  // ============ Quick option handlers ============
  function pickCampus(value: string) {
    push('user', value);
    setDraft((d) => ({ ...d, campus: value }));
    push('bot', 'Qual o **centro de custo** desta requisição?');
    setStep('centro_custo');
  }
  function pickCostCenter(id: string) {
    const cc = costCenters.find((c) => c.id === id);
    if (!cc) return;
    const label = `${cc.codigo} - ${cc.nome}`;
    push('user', label);
    setDraft((d) => ({ ...d, cost_center_id: id, cost_center: label, campus: d.campus || cc.campus || cc.unidade_polo || '' }));
    push('bot', 'Para qual **setor de destino** deseja encaminhar?');
    setStep('destino');
  }
  function pickDestination(value: string) {
    push('user', value);
    setDraft((d) => ({ ...d, destination_sector: value, request_type: '' }));
    push('bot', 'Qual o **tipo da requisição**?');
    setStep('tipo');
  }
  function pickRequestType(value: string) {
    push('user', value);
    setDraft((d) => ({ ...d, request_type: value }));
    push('bot', 'Qual o **assunto** da CI? (ex: COMPRA DE PAPEL A4, MANUTENÇÃO AR-CONDICIONADO)');
    setStep('assunto');
  }
  function pickPriority(value: CIPriority) {
    push('user', value.toUpperCase());
    setDraft((d) => ({ ...d, priority: value }));
    push('bot', (
      <>Pronto! Confira o resumo da CI no card abaixo e clique em <strong>Confirmar e enviar</strong>.</>
    ), 'Resumo gerado para revisão.');
    setStep('revisao');
  }

  // ============ Item composer ============
  const itemGuide = getItemGuideForRequestType(draft.request_type);
  const selectedUnitIsOther = itemDraft.unidade === CI_OTHER_UNIT_VALUE;

  function addItem() {
    const unidade = selectedUnitIsOther ? itemDraft.customUnit?.trim() : itemDraft.unidade?.trim();
    if (!itemDraft.descricao.trim()) { alert('Informe a descrição do item.'); return; }
    if (!itemDraft.quantidade || itemDraft.quantidade <= 0) { alert('Informe quantidade maior que zero.'); return; }
    if (!unidade) { alert('Selecione a unidade.'); return; }
    const newItem: ChatItem = {
      descricao: itemDraft.descricao.trim(),
      quantidade: itemDraft.quantidade,
      unidade,
      especificacao: itemDraft.especificacao?.trim() || undefined,
    };
    setDraft((d) => ({ ...d, items: [...d.items, newItem] }));
    setItemDraft({ descricao: '', quantidade: 1, unidade: '', especificacao: '' });
    push('user', `+ Item: ${newItem.quantidade} ${newItem.unidade} — ${newItem.descricao}`);
  }
  function removeItem(idx: number) {
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  }
  function handleBulkAdd(bulk: BulkItem[]) {
    const mapped: ChatItem[] = bulk.map((b) => ({
      descricao: b.descricao, quantidade: b.quantidade, unidade: b.unidade, especificacao: b.especificacao,
    }));
    setDraft((d) => ({ ...d, items: [...d.items, ...mapped] }));
    push('user', `+ ${mapped.length} item(ns) importados em lote`);
  }
  function finishItems() {
    if (draft.items.length === 0) { alert('Adicione pelo menos um item.'); return; }
    push('user', `Itens concluídos (${draft.items.length})`);
    push('bot', 'Descreva a **justificativa / finalidade** desta requisição.');
    setStep('justificativa');
  }

  // ============ Text-based send ============
  function handleSend() {
    const text = input.trim();
    if (!text) return;

    if (step === 'identidade') {
      let val = text;
      if (identityField === 'name' && !/^[a-zA-ZÀ-ÿ\s'-]+$/.test(val)) {
        push('bot', 'Por favor, informe apenas letras no nome.'); return;
      }
      if (identityField === 'registration' && !/^\d+$/.test(val)) {
        push('bot', 'A matrícula deve conter apenas números.'); return;
      }
      if (identityField === 'whatsapp') val = maskWhatsapp(val);
      push('user', val);
      setIdentity((id) => ({ ...id, [identityField]: val }));
      setInput('');
      setTimeout(nextIdentityField, 50);
      return;
    }

    push('user', text);
    setInput('');

    if (step === 'assunto') {
      setDraft((d) => ({ ...d, subject: text.toUpperCase() }));
      push('bot', (
        <>Agora vamos aos <strong>itens solicitados</strong>. Adicione um a um no formulário abaixo, ou importe em lote.</>
      ), 'Agora vamos aos itens solicitados.');
      setStep('itens');
      return;
    }
    if (step === 'justificativa') {
      setDraft((d) => ({ ...d, justificativa: text }));
      push('bot', 'Existe alguma **urgência** ou prazo institucional (MEC, visita, auditoria, evento)? Se não houver, escreva "nenhuma".');
      setStep('urgencia');
      return;
    }
    if (step === 'urgencia') {
      setDraft((d) => ({ ...d, urgencia: text }));
      const sug = suggestPriorityFromText(`${text} ${draft.subject} ${draft.justificativa}`);
      if (sug) {
        setDraft((d) => ({ ...d, priority: sug }));
        push('bot', `Identifiquei urgência institucional — sugiro prioridade **${sug.toUpperCase()}**. Confirme abaixo ou escolha outra.`);
      } else {
        push('bot', 'Qual a **prioridade** desta CI?');
      }
      setStep('prioridade');
      return;
    }
  }

  // ============ Finalize ============
  async function finalize() {
    const refsText = draft.items
      .map((i) => i.especificacao)
      .filter(Boolean)
      .join('\n');
    const description = [
      draft.justificativa,
      draft.urgencia && draft.urgencia.toLowerCase() !== 'nenhuma' ? `Urgência: ${draft.urgencia}` : '',
      refsText ? `\nObservações dos itens:\n${refsText}` : '',
    ].filter(Boolean).join('\n');

    try {
      const res = await submit.mutateAsync({
        channel,
        requester_name: identity.name,
        requester_registration: identity.registration,
        requester_role: identity.role,
        requester_sector: identity.sector,
        requester_whatsapp: identity.whatsapp,
        requester_email: profile?.email,
        source_sector: identity.sector,
        destination_sector: draft.destination_sector,
        request_type: draft.request_type,
        subject: draft.subject || draft.items[0]?.descricao?.toUpperCase() || 'REQUISIÇÃO',
        description,
        priority: draft.priority,
        created_by: createdBy ?? undefined,
      });

      // Update campus/cost center + insert items (mesmo padrão do CIStaticForm)
      try {
        if (draft.campus || draft.cost_center || draft.cost_center_id) {
          await supabase.from('ci_requests')
            .update({
              campus: draft.campus || null,
              cost_center: draft.cost_center || null,
              cost_center_id: draft.cost_center_id || null,
            } as never)
            .eq('id', res.id);
        }
        if (draft.items.length > 0 && organization) {
          await supabase.from('ci_items').insert(
            draft.items.map((it) => ({
              ci_id: res.id,
              organization_id: organization.organization_id,
              created_by: createdBy ?? undefined,
              descricao: it.descricao,
              quantidade: it.quantidade,
              unidade: it.unidade ?? null,
              especificacao: it.especificacao ?? null,
            })),
          );
        }
      } catch (e) {
        console.warn('[CI chatbot] falha ao salvar extras/itens', e);
      }

      setProtocol(res.protocol);
      setStep('enviado');
      push('bot', (
        <>
          <CheckCircle2 className="inline h-4 w-4 text-emerald-600 mr-1" />
          CI registrada com sucesso! Seu protocolo é <strong className="font-mono">{res.protocol}</strong>.
        </>
      ), `CI registrada — protocolo ${res.protocol}`);
    } catch (e: any) {
      push('bot', `Não consegui registrar a CI: ${e?.message ?? 'erro inesperado'}.`);
    }
  }

  const campusOptions = Array.from(new Set([
    ...campuses.map((c) => c.name),
    ...costCenters.map((c) => c.campus || c.unidade_polo).filter((v): v is string => !!v),
  ]));

  const availableCostCenters = draft.campus
    ? costCenters.filter((c) => c.campus === draft.campus || c.unidade_polo === draft.campus)
    : costCenters;

  // Show input bar only on text-input steps
  const textInputSteps: Step[] = ['identidade', 'assunto', 'justificativa', 'urgencia'];
  const showInput = textInputSteps.includes(step) && !(step === 'identidade' && !!savedIdentity);

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] max-h-[760px] overflow-hidden border-blue-200/60">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-blue-50/40 to-background">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'bot' && (
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={cn(
                'rounded-2xl px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap',
                m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border'
              )}>
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ========== QUICK ACTIONS BY STEP ========== */}
        {step === 'identidade' && savedIdentity && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" onClick={continueWithSaved}>Continuar com meus dados</Button>
            <Button size="sm" variant="outline" onClick={updateSaved}>Atualizar dados</Button>
          </div>
        )}

        {step === 'campus' && (
          <div className="pt-2 max-w-md">
            <Select value={draft.campus} onValueChange={pickCampus}>
              <SelectTrigger><SelectValue placeholder={campusOptions.length ? 'Selecione a unidade…' : 'Nenhuma unidade cadastrada'} /></SelectTrigger>
              <SelectContent>
                {campusOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 'centro_custo' && (
          <div className="pt-2 max-w-md">
            <Select value={draft.cost_center_id ?? ''} onValueChange={pickCostCenter}>
              <SelectTrigger><SelectValue placeholder={availableCostCenters.length ? 'Selecione o centro de custo…' : 'Nenhum CC disponível'} /></SelectTrigger>
              <SelectContent>
                {availableCostCenters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 'destino' && (
          <div className="flex flex-wrap gap-2 pt-2">
            {CI_DESTINATION_SECTORS.map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => pickDestination(s)}>{s}</Button>
            ))}
          </div>
        )}

        {step === 'tipo' && (
          <div className="flex flex-wrap gap-2 pt-2">
            {getRequestTypesForDestination(draft.destination_sector).map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => pickRequestType(s)}>{s}</Button>
            ))}
          </div>
        )}

        {step === 'itens' && (
          <div className="pt-2 rounded-xl border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold text-slate-700">Itens solicitados ({draft.items.length})</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1" />Importar em lote
                </Button>
                <Button size="sm" onClick={finishItems} disabled={draft.items.length === 0}>
                  Concluir itens
                </Button>
              </div>
            </div>

            {draft.items.length > 0 && (
              <ul className="space-y-1.5 text-xs">
                {draft.items.map((it, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 p-2">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{it.descricao}</div>
                      <div className="text-slate-500">{it.quantidade} {it.unidade}{it.especificacao ? ` — ${it.especificacao}` : ''}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder={itemGuide.descriptionPlaceholder}
                value={itemDraft.descricao}
                onChange={(e) => setItemDraft((d) => ({ ...d, descricao: e.target.value }))}
                className="sm:col-span-2"
              />
              <Input
                type="number" min={1} placeholder="Quantidade"
                value={itemDraft.quantidade}
                onChange={(e) => setItemDraft((d) => ({ ...d, quantidade: Number(e.target.value) || 0 }))}
              />
              <Select
                value={itemDraft.unidade ?? ''}
                onValueChange={(v) => setItemDraft((d) => ({ ...d, unidade: v, customUnit: '' }))}
              >
                <SelectTrigger><SelectValue placeholder="Unidade" /></SelectTrigger>
                <SelectContent>
                  {itemGuide.units.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedUnitIsOther && (
                <Input
                  placeholder="Informe a unidade"
                  value={itemDraft.customUnit ?? ''}
                  onChange={(e) => setItemDraft((d) => ({ ...d, customUnit: e.target.value }))}
                  className="sm:col-span-2"
                />
              )}
              <Input
                placeholder={itemGuide.detailPlaceholder}
                value={itemDraft.especificacao ?? ''}
                onChange={(e) => setItemDraft((d) => ({ ...d, especificacao: e.target.value }))}
                className="sm:col-span-2"
              />
              <Button size="sm" onClick={addItem} className="sm:col-span-2">
                <Plus className="h-3.5 w-3.5 mr-1" />Adicionar item
              </Button>
            </div>

            <p className="text-[11px] text-slate-500">{itemGuide.helperText}</p>
          </div>
        )}

        {step === 'prioridade' && (
          <div className="flex flex-wrap gap-2 pt-2">
            {(['baixa', 'media', 'alta', 'urgente'] as CIPriority[]).map((p) => (
              <Button
                key={p} size="sm"
                variant={draft.priority === p ? 'default' : 'outline'}
                onClick={() => pickPriority(p)}
              >
                {p.toUpperCase()}
              </Button>
            ))}
          </div>
        )}

        {step === 'revisao' && (
          <div className="pt-2 rounded-xl border bg-white p-4 space-y-2 text-sm">
            <div className="font-semibold text-slate-800 mb-1">Resumo da CI</div>
            <Row label="Solicitante" value={identity.name} />
            <Row label="Setor / Cargo" value={`${identity.sector}${identity.role ? ' • ' + identity.role : ''}`} />
            <Row label="Campus" value={draft.campus || '—'} />
            <Row label="Centro de Custo" value={draft.cost_center || '—'} />
            <Row label="Destino" value={draft.destination_sector} />
            <Row label="Tipo" value={draft.request_type} />
            <Row label="Assunto" value={draft.subject} />
            <Row label="Prioridade" value={draft.priority.toUpperCase()} />
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1 mt-2">Itens ({draft.items.length})</div>
              <ul className="space-y-1 text-xs">
                {draft.items.map((it, i) => (
                  <li key={i} className="text-slate-700">• {it.quantidade} {it.unidade} — {it.descricao}{it.especificacao ? ` (${it.especificacao})` : ''}</li>
                ))}
              </ul>
            </div>
            {draft.justificativa && <Row label="Justificativa" value={draft.justificativa} />}
            {draft.urgencia && <Row label="Urgência" value={draft.urgencia} />}
            <div className="flex gap-2 pt-3">
              <Button size="sm" onClick={finalize} disabled={submit.isPending}>
                {submit.isPending ? 'Enviando…' : 'Confirmar e enviar CI'}
              </Button>
            </div>
          </div>
        )}

        {step === 'enviado' && protocol && (
          <div className="rounded-lg border bg-emerald-50 p-4 text-sm space-y-3">
            <div>
              <div className="font-mono font-semibold text-emerald-800">{protocol}</div>
              <div className="text-emerald-700">Anote este protocolo para acompanhar sua CI.</div>
            </div>
            <Link to={`/unigops/ci/imprimir/${protocol}?auto=1`} target="_blank">
              <Button size="sm">
                <Printer className="h-4 w-4 mr-2" /> Imprimir comprovante
              </Button>
            </Link>
          </div>
        )}
      </div>

      {showInput && (
        <div className="border-t p-3 flex gap-2 bg-background">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua resposta…"
            autoFocus
          />
          <Button onClick={handleSend}><Send className="h-4 w-4" /></Button>
        </div>
      )}

      <CIBulkItemsModal open={bulkOpen} onOpenChange={setBulkOpen} onConfirm={handleBulkAdd} />
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-xs">
      <div className="text-slate-500 font-medium">{label}</div>
      <div className="text-slate-800">{value}</div>
    </div>
  );
}
