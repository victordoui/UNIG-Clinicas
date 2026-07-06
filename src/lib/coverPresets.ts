// Presets de capa para o banner de saudação (UNIG Facilities)
// Imagens hospedadas no Supabase Storage (bucket público `cover-presets`)
// para garantir disponibilidade em qualquer ambiente (preview, local, deploy externo).

const PRESET_BUCKET_BASE =
  'https://onngvrefjnzwvxmqnztd.supabase.co/storage/v1/object/public/cover-presets';

const presetUrl = (file: string) => ({ url: `${PRESET_BUCKET_BASE}/${file}` });

const principalNI = presetUrl('principal-nova-iguacu.jpg');
const bibliotecaNI = presetUrl('biblioteca-nova-iguacu.jpg');
const blocoKNI = presetUrl('bloco-k-nova-iguacu.jpg');
const fachadaIT = presetUrl('fachada-bloco-itaperuna.jpg');
const blocoAIT = presetUrl('bloco-a-itaperuna.jpg');
const labSaude = presetUrl('laboratorio-saude-unig.jpg');

export type CoverPreset = {
  id: string;
  label: string;
  url: string;
  from: string;
  to: string;
  angle: number;
};

// Cor padrão = mesmo azul da sidebar
export const SIDEBAR_BLUE = 'hsl(211, 89%, 22%)';

export const COVER_PRESETS: CoverPreset[] = [
  { id: 'unig-ni-principal',   label: 'Alameda Nova Iguaçu',     url: principalNI.url,  from: SIDEBAR_BLUE, to: '#3B82F6', angle: 90 },
  { id: 'unig-ni-biblioteca',  label: 'Biblioteca Nova Iguaçu',  url: bibliotecaNI.url, from: SIDEBAR_BLUE, to: '#3B82F6', angle: 90 },
  { id: 'unig-ni-bloco-k',     label: 'Bloco K — Nova Iguaçu',   url: blocoKNI.url,     from: SIDEBAR_BLUE, to: '#3B82F6', angle: 90 },
  { id: 'unig-it-fachada',     label: 'Fachada — Itaperuna',     url: fachadaIT.url,    from: SIDEBAR_BLUE, to: '#3B82F6', angle: 90 },
  { id: 'unig-it-bloco-a',     label: 'Bloco A — Itaperuna',     url: blocoAIT.url,     from: SIDEBAR_BLUE, to: '#3B82F6', angle: 90 },
  { id: 'unig-lab-saude',      label: 'Laboratório de Saúde',    url: labSaude.url,     from: SIDEBAR_BLUE, to: '#3B82F6', angle: 90 },
];


// Paleta exclusivamente azul para manter a essência do sistema
export const BLUE_PALETTE: { value: string; label: string }[] = [
  { value: SIDEBAR_BLUE, label: 'Azul padrão (sidebar)' },
  { value: '#0C2A66', label: 'Azul profundo' },
  { value: '#0B3B8C', label: 'Azul marinho' },
  { value: '#1E3A8A', label: 'Azul índigo' },
  { value: '#1E40AF', label: 'Azul corporativo' },
  { value: '#1D4ED8', label: 'Azul royal' },
  { value: '#2563EB', label: 'Azul vivo' },
  { value: '#3B82F6', label: 'Azul claro' },
  { value: '#60A5FA', label: 'Azul céu' },
  { value: '#0EA5E9', label: 'Ciano' },
];

export const COLOR_SWATCHES = BLUE_PALETTE.map(c => c.value);

export const GRADIENT_PRESETS = [
  { from: SIDEBAR_BLUE, to: '#1E40AF', angle: 135, label: 'Azul padrão (sidebar)' },
  { from: '#1E40AF', to: '#3B82F6', angle: 135, label: 'Azul corporativo' },
  { from: '#0F172A', to: '#1E40AF', angle: 135, label: 'Noite azul' },
  { from: '#1E40AF', to: '#0EA5E9', angle: 135, label: 'Céu azul' },
];

export function getPresetById(id?: string) {
  return COVER_PRESETS.find(p => p.id === id) ?? COVER_PRESETS[0];
}

export type KpiAccent = 'glass' | 'white' | 'blue' | 'emerald' | 'orange' | 'violet' | 'multi' | 'custom';

// IDs mantidos para retrocompatibilidade com dados salvos.
export const KPI_ACCENT_OPTIONS: {
  id: KpiAccent;
  label: string;
  previewBg: string;
  previewBorder: string;
  textOnDark?: boolean;
}[] = [
  { id: 'glass',   label: 'Glass',            previewBg: 'rgba(255,255,255,0.18)', previewBorder: 'rgba(255,255,255,0.35)', textOnDark: true },
  { id: 'white',   label: 'Branco',           previewBg: '#ffffff',                previewBorder: 'rgba(255,255,255,0.6)' },
  { id: 'blue',    label: 'Azul royal',       previewBg: 'rgba(37,99,235,0.55)',   previewBorder: 'rgba(147,197,253,0.6)', textOnDark: true },
  { id: 'emerald', label: 'Azul céu',         previewBg: 'rgba(14,165,233,0.55)',  previewBorder: 'rgba(125,211,252,0.6)', textOnDark: true },
  { id: 'orange',  label: 'Azul corporativo', previewBg: 'rgba(30,64,175,0.6)',    previewBorder: 'rgba(96,165,250,0.6)',  textOnDark: true },
  { id: 'violet',  label: 'Azul índigo',      previewBg: 'rgba(79,70,229,0.55)',   previewBorder: 'rgba(165,180,252,0.6)', textOnDark: true },
  { id: 'multi',   label: 'Multicolor',       previewBg: 'rgba(37,99,235,0.55)',   previewBorder: 'rgba(147,197,253,0.6)', textOnDark: true },
  { id: 'custom',  label: 'Personalizar cores', previewBg: 'rgba(255,255,255,0.18)', previewBorder: 'rgba(255,255,255,0.35)', textOnDark: true },
];

// Paleta tonal para os modos 'multi' e 'custom' (uma cor por card).
export type KpiToneId = 'blue' | 'emerald' | 'orange' | 'violet' | 'sky' | 'rose' | 'amber' | 'slate';
export type KpiSlot = 'blue' | 'emerald' | 'orange' | 'violet'; // 4 slots: andamento, finalizadas, aguardando, total

export const KPI_TONE_PALETTE: {
  id: KpiToneId;
  label: string;
  swatch: string;
  cardCls: string;
  iconCls: string;
}[] = [
  { id: 'blue',    label: 'Azul',    swatch: '#2563EB', cardCls: 'bg-blue-600/40 backdrop-blur-md border-blue-300/50 shadow-lg shadow-black/10',       iconCls: 'bg-blue-400/30 text-blue-50' },
  { id: 'emerald', label: 'Verde',   swatch: '#059669', cardCls: 'bg-emerald-600/40 backdrop-blur-md border-emerald-300/50 shadow-lg shadow-black/10', iconCls: 'bg-emerald-400/30 text-emerald-50' },
  { id: 'orange',  label: 'Laranja', swatch: '#EA580C', cardCls: 'bg-orange-600/45 backdrop-blur-md border-orange-300/50 shadow-lg shadow-black/10',   iconCls: 'bg-orange-400/30 text-orange-50' },
  { id: 'violet',  label: 'Roxo',    swatch: '#7C3AED', cardCls: 'bg-violet-600/40 backdrop-blur-md border-violet-300/50 shadow-lg shadow-black/10',   iconCls: 'bg-violet-400/30 text-violet-50' },
  { id: 'sky',     label: 'Ciano',   swatch: '#0EA5E9', cardCls: 'bg-sky-500/40 backdrop-blur-md border-sky-300/50 shadow-lg shadow-black/10',         iconCls: 'bg-sky-400/30 text-sky-50' },
  { id: 'rose',    label: 'Rosa',    swatch: '#E11D48', cardCls: 'bg-rose-600/40 backdrop-blur-md border-rose-300/50 shadow-lg shadow-black/10',       iconCls: 'bg-rose-400/30 text-rose-50' },
  { id: 'amber',   label: 'Âmbar',   swatch: '#D97706', cardCls: 'bg-amber-500/45 backdrop-blur-md border-amber-300/50 shadow-lg shadow-black/10',     iconCls: 'bg-amber-400/30 text-amber-50' },
  { id: 'slate',   label: 'Grafite', swatch: '#475569', cardCls: 'bg-slate-700/45 backdrop-blur-md border-slate-300/40 shadow-lg shadow-black/10',     iconCls: 'bg-slate-400/30 text-slate-50' },
];

export const KPI_MULTI_DEFAULT: Record<KpiSlot, KpiToneId> = {
  blue: 'blue',
  emerald: 'emerald',
  orange: 'orange',
  violet: 'violet',
};

export function getTone(id?: KpiToneId) {
  return KPI_TONE_PALETTE.find(t => t.id === id) ?? KPI_TONE_PALETTE[0];
}

// ============ Estilo dos botões da capa (CTAs) ============
export type CtaStyle = 'glass' | 'white' | 'blue' | 'outline';

export const CTA_STYLE_OPTIONS: {
  id: CtaStyle;
  label: string;
  description: string;
  primaryClass: string;
  secondaryClass: string;
}[] = [
  {
    id: 'glass',
    label: 'Glass',
    description: 'Translúcido com desfoque',
    primaryClass: 'bg-white/10 border border-white/40 text-white hover:bg-white/20 hover:text-white backdrop-blur font-semibold',
    secondaryClass: 'bg-white/10 border border-white/40 text-white hover:bg-white/20 hover:text-white backdrop-blur font-semibold',
  },
  {
    id: 'white',
    label: 'Branco sólido',
    description: 'Fundo branco com texto azul',
    primaryClass: 'bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-md',
    secondaryClass: 'bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-md',
  },
  {
    id: 'blue',
    label: 'Azul sólido',
    description: 'Azul corporativo com texto branco',
    primaryClass: 'bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md border border-blue-500',
    secondaryClass: 'bg-blue-600 text-white hover:bg-blue-700 font-semibold shadow-md border border-blue-500',
  },
  {
    id: 'outline',
    label: 'Outline branco',
    description: 'Apenas borda branca, sem fundo',
    primaryClass: 'bg-transparent border border-white/70 text-white hover:bg-white/10 hover:text-white font-semibold',
    secondaryClass: 'bg-transparent border border-white/70 text-white hover:bg-white/10 hover:text-white font-semibold',
  },
];

export function getCtaStyle(id?: CtaStyle) {
  return CTA_STYLE_OPTIONS.find(o => o.id === id) ?? CTA_STYLE_OPTIONS[0];
}
