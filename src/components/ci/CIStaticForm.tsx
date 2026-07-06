import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubmitCI } from '@/hooks/useCI';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  CI_DESTINATION_SECTORS, CI_REQUEST_TYPES, getRequestTypesForDestination,
  CI_OTHER_UNIT_VALUE, CI_PRIORITY_LABEL, getItemGuideForRequestType, type CIPriority, suggestPriorityFromText,
} from '@/lib/ciLabels';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eraser,
  FileText,
  Hash,
  Link as LinkIcon,
  Lock,
  MapPin,
  Package,
  Printer,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { CIBulkItemsModal, type BulkItem } from '@/components/ci/CIBulkItemsModal';
import { getSuggestionsForDestination } from '@/lib/ciItemSuggestions';
import { CITemplatesModal } from '@/components/ci/CITemplatesModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { formatPhoneBR, onlyDigits, onlyLetters } from '@/lib/masks';
import { useCampuses } from '@/hooks/useCampuses';
import { useMyCostCenters } from '@/hooks/useUserCostCenters';

interface DraftItem { descricao: string; quantidade: number; unidade?: string; especificacao?: string; observacao?: string }
interface ItemDraft extends DraftItem { customUnit?: string; links?: string }

const DRAFT_KEY = 'unigops:ci:form-draft';
const DRAFT_VERSION = 2;
const LOCK_COLLAPSE_KEY = 'ci.lockedFields.collapsed';

interface Props { channel?: 'formulario' | 'interno'; createdBy?: string | null }

interface CIFormState {
  requester_name?: string;
  requester_registration?: string;
  requester_role?: string;
  requester_sector?: string;
  requester_whatsapp?: string;
  campus?: string;
  cost_center?: string;
  cost_center_id?: string | null;
  destination_sector?: string;
  request_type?: string;
  subject?: string;
  description?: string;
  references?: string;
  priority?: CIPriority;
}

interface RestoredDraft {
  form: CIFormState;
  items: DraftItem[];
  itemDraft: ItemDraft;
}

interface StoredDraft extends RestoredDraft {
  version: typeof DRAFT_VERSION;
  updatedAt: string;
}

type DraftSaveStatus = 'saving' | 'saved' | 'error';

const EMPTY_ITEM_DRAFT: ItemDraft = { descricao: '', quantidade: 1, unidade: '', especificacao: '', customUnit: '', links: '' };

function readDraft(): RestoredDraft {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') {
      return { form: {}, items: [], itemDraft: EMPTY_ITEM_DRAFT };
    }
    if (parsed.version === DRAFT_VERSION) {
      return {
        form: parsed.form ?? {},
        items: Array.isArray(parsed.items) ? parsed.items : [],
        itemDraft: { ...EMPTY_ITEM_DRAFT, ...(parsed.itemDraft ?? {}) },
      };
    }
    return { form: parsed as CIFormState, items: [], itemDraft: EMPTY_ITEM_DRAFT };
  } catch {
    return { form: {}, items: [], itemDraft: EMPTY_ITEM_DRAFT };
  }
}

function validLinksFromText(value?: string) {
  return (value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line));
}

function formatItemReferenceLinks(value?: string) {
  const links = validLinksFromText(value);
  if (links.length === 0) return undefined;
  return `Links de referência:\n${links.map((url) => `- ${url}`).join('\n')}`;
}

export function CIStaticForm({ channel = 'formulario', createdBy }: Props) {
  const submit = useSubmitCI();
  const { profile, organization, currentRole, isSuperAdmin, unigRole } = useAuth();
  const { data: campuses = [] } = useCampuses();
  const { data: costCenters = [], isLoading: costCentersLoading } = useMyCostCenters();
  const [restoredDraft] = useState<RestoredDraft>(() => readDraft());
  const [protocol, setProtocol] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>(() => restoredDraft.items);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(() => restoredDraft.itemDraft);
  const [itemError, setItemError] = useState<string | null>(null);
  const [form, setForm] = useState<CIFormState>(() => restoredDraft.form);
  const [draftStatus, setDraftStatus] = useState<DraftSaveStatus>('saved');
  const skipNextAutosave = useRef(false);
  const [lockedCollapsed, setLockedCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(LOCK_COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LOCK_COLLAPSE_KEY, lockedCollapsed ? '1' : '0');
    } catch {
      // Storage access can be blocked in private or embedded contexts.
    }
  }, [lockedCollapsed]);

  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      requester_name: f.requester_name || profile.full_name || '',
      requester_registration: f.requester_registration || profile.registration || '',
      requester_role: f.requester_role || profile.job_role || '',
      requester_sector: f.requester_sector || profile.department || '',
      requester_whatsapp: f.requester_whatsapp || profile.whatsapp || '',
      ...f,
      ...(profile.full_name ? { requester_name: profile.full_name } : {}),
      ...(profile.registration ? { requester_registration: profile.registration } : {}),
      ...(profile.job_role ? { requester_role: profile.job_role } : {}),
      ...(profile.department ? { requester_sector: profile.department } : {}),
      ...(profile.whatsapp ? { requester_whatsapp: profile.whatsapp } : {}),
    }));
  }, [profile]);

  useEffect(() => {
    if (costCenters.length === 0 || form.cost_center_id) return;
    const preferred = costCenters.find((center) => center.is_default) ?? costCenters[0];
    if (!preferred) return;
    setForm((current) => ({
      ...current,
      cost_center_id: current.cost_center_id || preferred.id,
      cost_center: current.cost_center || `${preferred.codigo} - ${preferred.nome}`,
      campus: current.campus || preferred.campus || preferred.unidade_polo || '',
    }));
  }, [costCenters, form.cost_center_id]);

  useEffect(() => {
    if (protocol) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      setDraftStatus('saved');
      return;
    }
    setDraftStatus('saving');
    const timeout = window.setTimeout(() => {
      try {
        const payload: StoredDraft = {
          version: DRAFT_VERSION,
          form,
          items,
          itemDraft,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [form, itemDraft, items, protocol]);

  const set = <K extends keyof CIFormState>(k: K, v: CIFormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const lockedName = !!profile?.full_name;
  const lockedReg = !!profile?.registration;
  const lockedRole = !!profile?.job_role;
  const lockedSector = !!profile?.department;
  const canChangeCostCenter =
    isSuperAdmin ||
    currentRole === 'admin' ||
    ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'compras'].includes(unigRole) ||
    costCenters.length > 1;

  const availableCostCenters = costCenters.filter((center) => {
    if (!form.campus) return true;
    return center.campus === form.campus || center.unidade_polo === form.campus;
  });

  const selectedCostCenter = costCenters.find((center) => center.id === form.cost_center_id);
  const itemGuide = getItemGuideForRequestType(form.request_type);
  const selectedUnitIsOther = itemDraft.unidade === CI_OTHER_UNIT_VALUE;
  const campusOptions = Array.from(new Set([
    ...campuses.map((campus) => campus.name),
    ...costCenters
      .map((center) => center.campus || center.unidade_polo)
      .filter((name): name is string => !!name),
  ]));

  const setCostCenter = (id: string) => {
    const center = costCenters.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      cost_center_id: center?.id ?? null,
      cost_center: center ? `${center.codigo} - ${center.nome}` : '',
      campus: current.campus || center?.campus || center?.unidade_polo || '',
    }));
  };
  const lockedWhats = !!profile?.whatsapp;

  const setRequestType = (value: string) => {
    set('request_type', value);
    setItemError(null);
    setItemDraft((current) => ({ ...current, unidade: '', customUnit: '' }));
  };

  function saveDraft() {
    try {
      const payload: StoredDraft = {
        version: DRAFT_VERSION,
        form,
        items,
        itemDraft,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setDraftStatus('saved');
    } catch {
      setDraftStatus('error');
    }
  }

  function clearForm() {
    const keep = {
      requester_name: profile?.full_name || '',
      requester_registration: profile?.registration || '',
      requester_role: profile?.job_role || '',
      requester_sector: profile?.department || '',
      requester_whatsapp: profile?.whatsapp || '',
    };
    skipNextAutosave.current = true;
    setForm(keep);
    setItems([]);
    setItemDraft({ ...EMPTY_ITEM_DRAFT });
    setItemError(null);
    localStorage.removeItem(DRAFT_KEY);
    setDraftStatus('saved');
  }

  async function send() {
    if (!form.requester_name || !form.subject) {
      alert('Nome e Assunto são obrigatórios.');
      return;
    }
    if (items.length === 0) {
      setItemError('Adicione pelo menos um item solicitado antes de enviar.');
      alert('Adicione pelo menos um item solicitado antes de enviar.');
      return;
    }
    const sug = suggestPriorityFromText(`${form.subject} ${form.description ?? ''}`);
    const priority: CIPriority = (form.priority as CIPriority) ?? sug ?? 'media';
    const refs = (form.references ?? '')
      .split(/[\n,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));
    const baseDesc = (form.description ?? '').trim();
    const fullDesc = refs.length
      ? `${baseDesc}\n\nReferências:\n${refs.map((u) => `- ${u}`).join('\n')}`
      : baseDesc;
    const res = await submit.mutateAsync({
      channel,
      requester_name: form.requester_name,
      requester_registration: form.requester_registration,
      requester_role: form.requester_role,
      requester_sector: form.requester_sector,
      requester_whatsapp: form.requester_whatsapp,
      requester_email: profile?.email,
      source_sector: form.requester_sector || null,
      destination_sector: form.destination_sector,
      request_type: form.request_type,
      subject: form.subject,
      description: fullDesc,
      priority,
      created_by: createdBy ?? undefined,
    });
    try {
      if (form.campus || form.cost_center || form.cost_center_id) {
        await supabase.from('ci_requests')
          .update({
            campus: form.campus || selectedCostCenter?.campus || selectedCostCenter?.unidade_polo || null,
            cost_center: form.cost_center || (selectedCostCenter ? `${selectedCostCenter.codigo} - ${selectedCostCenter.nome}` : null),
            cost_center_id: form.cost_center_id || null,
          } as never)
          .eq('id', res.id);
      }
      if (items.length > 0 && organization) {
        await supabase.from('ci_items').insert(
          items.map(it => ({
            ci_id: res.id,
            organization_id: organization.organization_id,
            created_by: createdBy ?? undefined,
            descricao: it.descricao,
            quantidade: it.quantidade,
            unidade: it.unidade ?? null,
            especificacao: it.especificacao ?? null,
            observacao: it.observacao ?? null,
          })),
        );
      }
    } catch (e) {
      console.warn('[CI] falha ao salvar extras/itens', e);
    }
    setProtocol(res.protocol);
    setItems([]);
    clearForm();
  }

  function addItem() {
    const unidade = selectedUnitIsOther ? itemDraft.customUnit?.trim() : itemDraft.unidade?.trim();
    if (!itemDraft.descricao.trim()) {
      setItemError('Informe a descrição do item.');
      return;
    }
    if (!itemDraft.quantidade || itemDraft.quantidade <= 0) {
      setItemError('Informe uma quantidade maior que zero.');
      return;
    }
    if (!unidade) {
      setItemError('Selecione ou informe a unidade de medida.');
      return;
    }
    const observacao = formatItemReferenceLinks(itemDraft.links);
    setItems(prev => [...prev, {
      descricao: itemDraft.descricao.trim(),
      quantidade: itemDraft.quantidade,
      unidade,
      especificacao: itemDraft.especificacao?.trim() || undefined,
      observacao,
    }]);
    setItemDraft({ ...EMPTY_ITEM_DRAFT });
    setItemError(null);
  }
  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  // Modais: importação em lote e modelos
  const [bulkOpen, setBulkOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesMode, setTemplatesMode] = useState<'save' | 'load'>('load');

  function handleBulkAdd(bulk: BulkItem[]) {
    setItems(prev => [
      ...prev,
      ...bulk.map(b => ({
        descricao: b.descricao,
        quantidade: b.quantidade,
        unidade: b.unidade,
        especificacao: b.especificacao,
      })),
    ]);
  }

  function handleApplyTemplate(payload: any) {
    if (payload?.form && typeof payload.form === 'object') {
      setForm((f) => ({ ...f, ...payload.form }));
    }
    if (Array.isArray(payload?.items)) {
      setItems(payload.items);
    }
  }


  const draftStatusLabel =
    draftStatus === 'saving'
      ? 'Salvando...'
      : draftStatus === 'error'
        ? 'Não foi possível salvar localmente'
        : 'Rascunho salvo';

  if (protocol) {
    return (
      <Card className="p-8 text-center space-y-3 border-emerald-200 bg-emerald-50/40 animate-fade-in">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <h3 className="text-xl font-semibold">CI registrada com sucesso!</h3>
        <div className="font-mono text-2xl text-emerald-700">{protocol}</div>
        <p className="text-sm text-muted-foreground">Anote este protocolo para acompanhar sua solicitação.</p>
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Link to={`/unigops/ci/imprimir/${protocol}?auto=1`} target="_blank">
            <Button>
              <Printer className="h-4 w-4 mr-2" /> Imprimir comprovante
            </Button>
          </Link>
          <Button onClick={() => setProtocol(null)} variant="outline">Abrir nova CI</Button>
          <Link to="/unigops/ci/consulta"><Button variant="outline">Ver minhas CIs</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="bg-white shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-primary px-6 sm:px-8 py-6 text-primary-foreground">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6" /> Formulário CI
        </h1>
        <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-widest mt-1">
          Requisição de Compra Interna
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-10">
        {/* Seus dados */}
        <Card className="p-5 border-slate-200 shadow-sm">
        <Collapsible open={!lockedCollapsed} onOpenChange={(o) => setLockedCollapsed(!o)}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <SectionHeader icon={Lock} title="Seus dados" description="Informações usadas para identificar quem está solicitando." />
              <CollapsibleTrigger className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                {lockedCollapsed ? <>Mostrar <ChevronDown className="h-3.5 w-3.5" /></> : <>Ocultar <ChevronUp className="h-3.5 w-3.5" /></>}
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
              <div className="bg-slate-50/60 p-5 sm:p-6 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-y-5 gap-x-8">
                <div className="lg:col-span-2"><ReadOnlyField label="Nome completo" value={form.requester_name} locked={lockedName} onChange={v => set('requester_name', onlyLetters(v))} /></div>
                <ReadOnlyField label="Matrícula" value={form.requester_registration} locked={lockedReg} onChange={v => set('requester_registration', onlyDigits(v))} inputMode="numeric" />
                <ReadOnlyField label="WhatsApp" value={formatPhoneBR(form.requester_whatsapp ?? '')} locked={lockedWhats} onChange={v => set('requester_whatsapp', formatPhoneBR(v))} placeholder="(00) 00000-0000" inputMode="tel" />
                <ReadOnlyField label="Setor / Departamento" value={form.requester_sector} locked={lockedSector} onChange={v => set('requester_sector', v)} />
                <div className="md:col-span-2 lg:col-span-1">
                  <ReadOnlyField label="Cargo" value={form.requester_role} locked={lockedRole} onChange={v => set('requester_role', v)} />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 pl-1">
                Para alterar estas informações, edite em <em>Meu Perfil</em>.
              </p>
            </CollapsibleContent>
        </Collapsible>
        </Card>

        {/* Informações da Requisição */}
        <Card className="p-5 border-slate-200 shadow-sm">
        <div className="space-y-6">
          <SectionHeader icon={FileText} title="Informações da Requisição" description="Defina para onde o pedido vai e explique o que precisa." />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Send className="h-3.5 w-3.5 text-primary" />Encaminhar para</Label>
              <Select value={form.destination_sector} onValueChange={(v) => {
                set('destination_sector', v);
                const allowed = getRequestTypesForDestination(v);
                if (form.request_type && !allowed.includes(form.request_type)) setRequestType('');
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione a área que vai atender esta requisição" /></SelectTrigger>
                <SelectContent>{CI_DESTINATION_SECTORS.map((s) => <SelectItem key={s} value={s} data-option-domain="institutionalSector">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-primary" />Tipo de Pedido</Label>
              <Select value={form.request_type ?? ''} onValueChange={setRequestType} disabled={!form.destination_sector}>
                <SelectTrigger><SelectValue placeholder={form.destination_sector ? 'Selecione o tipo para orientar os itens' : 'Selecione primeiro para onde encaminhar'} /></SelectTrigger>
                <SelectContent>{getRequestTypesForDestination(form.destination_sector).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" />Unidade / Campus</Label>
              <Select value={form.campus ?? ''} onValueChange={(v) => {
                set('campus', v);
                const current = costCenters.find((center) => center.id === form.cost_center_id);
                if (current && current.campus !== v && current.unidade_polo !== v) {
                  set('cost_center_id', null);
                  set('cost_center', '');
                }
              }}>
                <SelectTrigger><SelectValue placeholder={campuses.length ? 'Selecione…' : 'Nenhuma unidade cadastrada'} /></SelectTrigger>
                <SelectContent>
                  {campusOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" />Centro de Custo</Label>
              <Select
                value={form.cost_center_id ?? ''}
                onValueChange={setCostCenter}
                disabled={costCentersLoading || availableCostCenters.length === 0 || !canChangeCostCenter}
              >
                <SelectTrigger>
                  <SelectValue placeholder={costCentersLoading ? 'Carregando…' : 'Selecione um centro de custo'} />
                </SelectTrigger>
                <SelectContent>
                  {availableCostCenters.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.codigo} - {center.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCostCenter && (
                <p className="text-[11px] text-slate-500">
                  {selectedCostCenter.classificacao || 'Sem classificação'} • {selectedCostCenter.setor_departamento || selectedCostCenter.nome}
                </p>
              )}
              {!costCentersLoading && costCenters.length === 0 && (
                <p className="text-[11px] text-amber-600">
                  Este usuário ainda não possui centro de custo vinculado. Configure em Administração &gt; Setores / Centro de Custo.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" />Assunto da Requisição *</Label>
            <Input value={form.subject ?? ''} onChange={(e) => set('subject', e.target.value)} placeholder="Ex: PENDRIVE 16GB" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-primary" />Descrição detalhada</Label>
            <Textarea rows={5} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Descreva item, quantidade, finalidade e setor que utilizará." />
          </div>
        </div>
        </Card>

          {/* Itens */}
        <Card className="p-5 border-slate-200 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <SectionHeader
                icon={Package}
                title="Itens solicitados"
                description="Adicione pelo menos um item com quantidade, unidade e detalhes para compra."
                badge="obrigatório"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="shrink-0">
                <Upload className="h-4 w-4 mr-1" />Importar em lote
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
              <p className="text-xs text-slate-500">{itemGuide.helperText}</p>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5 flex flex-col space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 h-5"><Package className="h-3.5 w-3.5 text-primary" />Descrição do item</Label>
                  <Input
                    placeholder={itemGuide.descriptionPlaceholder}
                    value={itemDraft.descricao}
                    onChange={e => setItemDraft({ ...itemDraft, descricao: e.target.value })}
                    list="ci-item-suggestions"
                  />
                  {form.destination_sector && getSuggestionsForDestination(form.destination_sector).length > 0 && (
                    <datalist id="ci-item-suggestions">
                      {getSuggestionsForDestination(form.destination_sector).map((s) => (
                        <option key={s.descricao} value={s.descricao} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div className="md:col-span-2 flex flex-col space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 h-5"><Hash className="h-3.5 w-3.5 text-primary" />Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder={itemGuide.quantityPlaceholder}
                    value={itemDraft.quantidade}
                    onChange={e => setItemDraft({ ...itemDraft, quantidade: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="md:col-span-3 flex flex-col space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 h-5"><ClipboardList className="h-3.5 w-3.5 text-primary" />Unidade de medida</Label>
                  <Select
                    value={itemDraft.unidade ?? ''}
                    onValueChange={(value) => setItemDraft({ ...itemDraft, unidade: value, customUnit: value === CI_OTHER_UNIT_VALUE ? itemDraft.customUnit : '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemGuide.units.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex flex-col">
                  <Button type="button" variant="outline" onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />Adicionar
                  </Button>
                </div>
                {selectedUnitIsOther && (
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Qual unidade?</Label>
                    <Input
                      placeholder="Ex: bandeja, lata, metro"
                      value={itemDraft.customUnit ?? ''}
                      onChange={e => setItemDraft({ ...itemDraft, customUnit: e.target.value })}
                    />
                  </div>
                )}
                <div className={selectedUnitIsOther ? 'md:col-span-8 space-y-1.5' : 'md:col-span-12 space-y-1.5'}>
                  <Label className="text-xs font-semibold text-slate-700">Detalhes para compra</Label>
                  <Textarea
                    rows={2}
                    placeholder={itemGuide.detailPlaceholder}
                    value={itemDraft.especificacao ?? ''}
                    onChange={e => setItemDraft({ ...itemDraft, especificacao: e.target.value })}
                  />
                </div>
                <div className="md:col-span-12 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5 text-primary" />Links deste item</Label>
                  <Textarea
                    rows={2}
                    placeholder="Cole um link por linha para este item específico"
                    value={itemDraft.links ?? ''}
                    onChange={e => setItemDraft({ ...itemDraft, links: e.target.value })}
                  />
                  <p className="text-[11px] text-slate-400">Serão enviados apenas links iniciados por http:// ou https://.</p>
                </div>
              </div>
              {itemError && <p className="text-xs font-medium text-red-600">{itemError}</p>}
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl py-6 flex items-center justify-center bg-slate-50/30">
                <p className="text-slate-400 text-xs font-medium">Nenhum item adicionado. Inclua pelo menos um item para enviar a requisição.</p>
              </div>
            ) : (
              <ul className="space-y-1 pt-1">
                {items.map((it, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 text-sm bg-background border rounded px-3 py-2">
                    <div className="min-w-0">
                      <div><strong>{it.quantidade}{it.unidade ? ` ${it.unidade}` : ''}</strong> — {it.descricao}</div>
                      {it.especificacao && <div className="text-xs text-slate-500 mt-1">{it.especificacao}</div>}
                      {it.observacao && <div className="text-xs text-slate-500 mt-1 whitespace-pre-line">{it.observacao}</div>}
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm">
          <div className="space-y-4">
          <SectionHeader icon={LinkIcon} title="Referências gerais" description="Use este campo para links que servem para a requisição inteira." />
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Links de referência <span className="text-[10px] font-normal text-slate-400">(opcional — Mercado Livre, Amazon, sites do fornecedor…)</span>
            </Label>
            <Textarea
              rows={2}
              value={form.references ?? ''}
              onChange={(e) => set('references', e.target.value)}
              placeholder="Cole uma URL por linha (https://...)"
            />
          </div>
          </div>
        </Card>

        <Card className="p-5 border-slate-200 shadow-sm">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Prioridade</Label>
            <Select value={form.priority ?? 'media'} onValueChange={(v) => set('priority', v as CIPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CI_PRIORITY_LABEL) as CIPriority[]).map((p) => (
                  <SelectItem key={p} value={p} data-option-domain="priority">{CI_PRIORITY_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Actions */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={clearForm}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpar formulário
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => { setTemplatesMode('load'); setTemplatesOpen(true); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Usar modelo
            </button>
            <button
              type="button"
              onClick={() => { setTemplatesMode('save'); setTemplatesOpen(true); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar como modelo
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <span className={draftStatus === 'error' ? 'text-xs font-medium text-red-600' : 'text-xs font-medium text-slate-500'}>
              {draftStatusLabel}
            </span>
            <Button variant="outline" onClick={saveDraft} className="flex-1 sm:flex-none">
              Rascunho salvo automaticamente
            </Button>
            <Button onClick={send} disabled={submit.isPending} className="flex-1 sm:flex-none shadow-lg shadow-primary/20">
              {submit.isPending ? 'Enviando…' : 'Enviar CI'}
            </Button>
          </div>
        </div>
      </div>

      <CIBulkItemsModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onConfirm={handleBulkAdd}
        defaultUnit="UN"
        destinationSector={form.destination_sector}
        existingItems={items.map(i => ({ descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade ?? '', especificacao: i.especificacao }))}
      />
      <CITemplatesModal
        open={templatesOpen}
        mode={templatesMode}
        onOpenChange={setTemplatesOpen}
        currentPayload={{ form, items }}
        onApply={handleApplyTemplate}
      />
    </div>
  );
}


function ReadOnlyField({
  label, value, locked, onChange, placeholder, inputMode,
}: { label: string; value: string; locked: boolean; onChange: (v: string) => void; placeholder?: string; inputMode?: 'numeric' | 'tel' | 'text' }) {
  if (locked) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-slate-500 select-text" aria-readonly="true">
          {value || <span className="italic text-slate-300">—</span>}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="h-10 w-10 rounded-lg border border-primary/20 bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
          {badge && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">{badge}</span>}
        </div>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
