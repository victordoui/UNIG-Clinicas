import { CI_REQUEST_TYPE_OPTIONS, INSTITUTIONAL_SECTOR_OPTIONS } from "@/lib/optionCatalog";

export type CIStatus =
  | 'recebida' | 'em_analise'
  | 'aguardando_validacao_tecnica' | 'ajuste_solicitado_engenheira'
  | 'aguardando_validacao_regulatoria' | 'ajuste_solicitado_regulatorio'
  | 'aguardando_coordenador'
  | 'aguardando_aprovacao' | 'aprovada'
  | 'em_cotacao'
  | 'aguardando_gerente' | 'aguardando_conselho' | 'revisao_solicitada' | 'desaprovada_conselho'
  | 'pedido_emitido' | 'aguardando_entrega' | 'recebida_estoque'
  | 'finalizada' | 'cancelada' | 'reprovada';

export type CIPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type CIChannel = 'chatbot' | 'formulario' | 'interno';
export type CIStage = 'triagem' | 'cotacao' | 'aprovacao' | 'pedido' | 'entrega' | 'finalizada';

export const CI_STATUS_LABEL: Record<CIStatus, string> = {
  recebida: 'Recebida',
  em_analise: 'Em análise',
  aguardando_validacao_tecnica: 'Aguardando Engenheira',
  ajuste_solicitado_engenheira: 'Ajuste solicitado (Engenheira)',
  aguardando_validacao_regulatoria: 'Aguardando Regulatório',
  ajuste_solicitado_regulatorio: 'Ajuste solicitado (Regulatório)',
  aguardando_coordenador: 'Aguardando Coordenador',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  em_cotacao: 'Em cotação',
  aguardando_gerente: 'Aguardando Gerente Geral',
  aguardando_conselho: 'Aguardando Conselho',
  revisao_solicitada: 'Revisão solicitada (Conselho)',
  desaprovada_conselho: 'Desaprovada pelo Conselho',
  pedido_emitido: 'Pedido emitido',
  aguardando_entrega: 'Aguardando entrega',
  recebida_estoque: 'Recebido',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  reprovada: 'Reprovada',
};

export const CI_STATUS_BADGE: Record<CIStatus, string> = {
  recebida: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  em_analise: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  aguardando_validacao_tecnica: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  ajuste_solicitado_engenheira: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  aguardando_validacao_regulatoria: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  ajuste_solicitado_regulatorio: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  aguardando_coordenador: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  aguardando_aprovacao: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  aprovada: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  em_cotacao: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  aguardando_gerente: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30',
  aguardando_conselho: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  revisao_solicitada: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  desaprovada_conselho: 'bg-red-500/15 text-red-700 border-red-500/30',
  pedido_emitido: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  aguardando_entrega: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  recebida_estoque: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  finalizada: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  cancelada: 'bg-muted text-muted-foreground border-border',
  reprovada: 'bg-red-500/15 text-red-700 border-red-500/30',
};

export const CI_KANBAN_COLUMNS: CIStatus[] = [
  'recebida','em_analise','aguardando_validacao_tecnica','aguardando_validacao_regulatoria','aguardando_coordenador',
  'aguardando_aprovacao','aprovada','em_cotacao',
  'aguardando_gerente','aguardando_conselho',
  'pedido_emitido','aguardando_entrega','recebida_estoque','finalizada','cancelada',
];

export const CI_PRIORITY_LABEL: Record<CIPriority, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
};

export const CI_PRIORITY_BADGE: Record<CIPriority, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-500/15 text-blue-700',
  alta: 'bg-amber-500/15 text-amber-700',
  urgente: 'bg-red-500/15 text-red-700',
};

export const CI_CHANNEL_LABEL: Record<CIChannel, string> = {
  chatbot: 'Chatbot',
  formulario: 'Formulário',
  interno: 'Nova Requisição',
};

export const CI_CHANNEL_BADGE: Record<CIChannel, string> = {
  chatbot: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  formulario: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  interno: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
};

export const CI_STAGE_LABEL: Record<CIStage, string> = {
  triagem: 'Triagem',
  cotacao: 'Cotação',
  aprovacao: 'Aprovação',
  pedido: 'Pedido',
  entrega: 'Entrega',
  finalizada: 'Finalizada',
};

export const CI_STAGE_BADGE: Record<CIStage, string> = {
  triagem: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cotacao: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  aprovacao: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  pedido: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  entrega: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  finalizada: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
};

export const CI_SOURCE_SECTORS = INSTITUTIONAL_SECTOR_OPTIONS
  .filter((option) => ['coordenacoes_integradas', 'administrativo', 'financeiro', 'laboratorios', 'rh', 'ti', 'biblioteca', 'almoxarifado'].includes(option.value))
  .map((option) => option.label);

export const CI_DESTINATION_SECTORS = INSTITUTIONAL_SECTOR_OPTIONS
  .filter((option) => ['compras', 'almoxarifado', 'financeiro', 'ti', 'administrativo', 'juridico'].includes(option.value))
  .map((option) => option.label);

export const CI_REQUEST_TYPES = CI_REQUEST_TYPE_OPTIONS.map((option) => option.label);

export const CI_REQUEST_TYPES_BY_DESTINATION: Record<string, string[]> = {
  'Compras':        ['Insumos', 'Alimentos', 'Itens de Informática', 'Material de Escritório', 'Mobiliário', 'Equipamentos', 'Serviços', 'Outros'],
  'Almoxarifado':   ['Retirada', 'Transferência entre Unidades', 'Armazenamento', 'Devolução', 'Inventário', 'Outros'],
  'TI':             ['Hardware', 'Software / Licença', 'Acesso / Conta', 'Suporte Técnico', 'Infraestrutura de Rede', 'Outros'],
  'Financeiro':     ['Pagamento', 'Reembolso', 'Adiantamento', 'Nota Fiscal', 'Outros'],
  'Administrativo': ['Documentação', 'Manutenção Predial', 'Logística', 'Outros'],
  'Jurídico':       ['Contrato', 'Parecer', 'Análise de Cláusula', 'Outros'],
};

export interface CIItemUnitOption {
  value: string;
  label: string;
}

export interface CIItemGuide {
  descriptionPlaceholder: string;
  quantityPlaceholder: string;
  detailPlaceholder: string;
  helperText: string;
  units: CIItemUnitOption[];
}

export const CI_OTHER_UNIT_VALUE = '__outra_unidade__';

const UNIT_OPTIONS = {
  kg: { value: 'kg', label: 'kg - Quilograma' },
  g: { value: 'g', label: 'g - Grama' },
  l: { value: 'L', label: 'L - Litro' },
  un: { value: 'un', label: 'un - Unidade' },
  cx: { value: 'cx', label: 'cx - Caixa' },
  pct: { value: 'pct', label: 'pct - Pacote' },
  fardo: { value: 'fardo', label: 'fardo - Fardo' },
  kit: { value: 'kit', label: 'kit - Kit' },
  resma: { value: 'resma', label: 'resma - Resma' },
  rolo: { value: 'rolo', label: 'rolo - Rolo' },
  par: { value: 'par', label: 'par - Par' },
  h: { value: 'h', label: 'h - Hora' },
  diaria: { value: 'diária', label: 'diária - Diária' },
  mes: { value: 'mês', label: 'mês - Mês' },
  contrato: { value: 'contrato', label: 'contrato - Contrato/serviço' },
  outra: { value: CI_OTHER_UNIT_VALUE, label: 'Outra unidade' },
} satisfies Record<string, CIItemUnitOption>;

const GENERAL_UNITS = [UNIT_OPTIONS.un, UNIT_OPTIONS.cx, UNIT_OPTIONS.pct, UNIT_OPTIONS.kit, UNIT_OPTIONS.outra];

export const CI_ITEM_UNIT_GUIDES: Record<string, CIItemGuide> = {
  Alimentos: {
    descriptionPlaceholder: 'Ex: Arroz tipo 1',
    quantityPlaceholder: '10',
    detailPlaceholder: 'Ex: marca preferencial, validade mínima, embalagem ou observações',
    helperText: 'Informe o alimento como a pessoa compradora deve procurar, com medida e detalhes importantes.',
    units: [UNIT_OPTIONS.kg, UNIT_OPTIONS.g, UNIT_OPTIONS.l, UNIT_OPTIONS.un, UNIT_OPTIONS.cx, UNIT_OPTIONS.pct, UNIT_OPTIONS.fardo, UNIT_OPTIONS.outra],
  },
  Insumos: {
    descriptionPlaceholder: 'Ex: Copo descartável 200 ml',
    quantityPlaceholder: '5',
    detailPlaceholder: 'Ex: tamanho, material, marca ou finalidade',
    helperText: 'Use detalhes simples para evitar compra errada: tamanho, material, modelo ou uso previsto.',
    units: [UNIT_OPTIONS.un, UNIT_OPTIONS.cx, UNIT_OPTIONS.pct, UNIT_OPTIONS.kit, UNIT_OPTIONS.resma, UNIT_OPTIONS.rolo, UNIT_OPTIONS.outra],
  },
  'Material de Escritório': {
    descriptionPlaceholder: 'Ex: Papel A4 branco',
    quantityPlaceholder: '2',
    detailPlaceholder: 'Ex: gramatura, cor, tamanho ou marca preferencial',
    helperText: 'Para materiais de escritório, informe formato, cor, tamanho e quantidade por embalagem quando souber.',
    units: [UNIT_OPTIONS.un, UNIT_OPTIONS.cx, UNIT_OPTIONS.pct, UNIT_OPTIONS.kit, UNIT_OPTIONS.resma, UNIT_OPTIONS.rolo, UNIT_OPTIONS.outra],
  },
  'Itens de Informática': {
    descriptionPlaceholder: 'Ex: Mouse USB',
    quantityPlaceholder: '5',
    detailPlaceholder: 'Ex: conexão, compatibilidade, modelo ou equipamento onde será usado',
    helperText: 'Informe modelo, conexão e compatibilidade para ajudar TI e compras.',
    units: [UNIT_OPTIONS.un, UNIT_OPTIONS.kit, UNIT_OPTIONS.par, UNIT_OPTIONS.cx, UNIT_OPTIONS.outra],
  },
  Equipamentos: {
    descriptionPlaceholder: 'Ex: Projetor multimídia',
    quantityPlaceholder: '1',
    detailPlaceholder: 'Ex: potência, voltagem, medidas, modelo ou uso esperado',
    helperText: 'Descreva características essenciais para comparar orçamentos com segurança.',
    units: [UNIT_OPTIONS.un, UNIT_OPTIONS.kit, UNIT_OPTIONS.par, UNIT_OPTIONS.cx, UNIT_OPTIONS.outra],
  },
  Mobiliário: {
    descriptionPlaceholder: 'Ex: Cadeira giratória',
    quantityPlaceholder: '4',
    detailPlaceholder: 'Ex: cor, medidas, material ou local de uso',
    helperText: 'Para móveis, informe medidas, cor, material e onde será utilizado.',
    units: [UNIT_OPTIONS.un, UNIT_OPTIONS.kit, UNIT_OPTIONS.par, UNIT_OPTIONS.cx, UNIT_OPTIONS.outra],
  },
  Serviços: {
    descriptionPlaceholder: 'Ex: Manutenção de ar-condicionado',
    quantityPlaceholder: '1',
    detailPlaceholder: 'Ex: local, período, problema observado ou escopo esperado',
    helperText: 'Para serviços, descreva o local, o problema e o resultado esperado.',
    units: [UNIT_OPTIONS.h, UNIT_OPTIONS.diaria, UNIT_OPTIONS.mes, UNIT_OPTIONS.un, UNIT_OPTIONS.contrato, UNIT_OPTIONS.outra],
  },
  Outros: {
    descriptionPlaceholder: 'Ex: Item ou serviço necessário',
    quantityPlaceholder: '1',
    detailPlaceholder: 'Ex: informações que ajudem a identificar corretamente o pedido',
    helperText: 'Se não souber a unidade, escolha “Outra unidade” e escreva como costuma chamar.',
    units: GENERAL_UNITS,
  },
};

export function getItemGuideForRequestType(requestType?: string | null): CIItemGuide {
  if (!requestType) return CI_ITEM_UNIT_GUIDES.Outros;
  return CI_ITEM_UNIT_GUIDES[requestType] ?? CI_ITEM_UNIT_GUIDES.Outros;
}

export function getRequestTypesForDestination(dest?: string | null): string[] {
  if (!dest) return [];
  return CI_REQUEST_TYPES_BY_DESTINATION[dest] ?? CI_REQUEST_TYPES;
}

export const CI_CAMPUSES = [
  'Campus Sede','Campus Centro','Campus Norte','Campus Sul','EAD',
];

export function suggestPriorityFromText(text: string): CIPriority | null {
  const t = (text || '').toLowerCase();
  if (/\b(mec|visita|urg[êe]ncia|auditoria)\b/.test(t)) return 'alta';
  return null;
}

export function generateInstitutionalDescription(opts: {
  quantidade?: string; item?: string; finalidade?: string; setor?: string;
}): string {
  const { quantidade, item, finalidade, setor } = opts;
  const q = quantidade?.trim() || '01';
  const i = item?.trim() || 'item solicitado';
  const f = finalidade?.trim() ? ` para ${finalidade.trim()}` : '';
  const s = setor?.trim() ? ` do setor ${setor.trim()}` : '';
  return `Solicito a disponibilização da compra de ${q} ${i}${f}${s}.`;
}
