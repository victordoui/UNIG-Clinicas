// Constants & labels for the supplier portal (status, categorias, documentos)
import { SUPPLIER_CATEGORY_OPTIONS } from "@/lib/optionCatalog";

export type SupplierStatus =
  | "rascunho"
  | "convidado"
  | "acesso_criado"
  | "cadastro_incompleto"
  | "aguardando_envio"
  | "em_analise"
  | "pendente_correcao"
  | "aprovado"
  | "reprovado"
  | "bloqueado"
  | "documentacao_vencida";

export const SUPPLIER_STATUS_LABEL: Record<SupplierStatus, string> = {
  rascunho: "Rascunho",
  convidado: "Convidado",
  acesso_criado: "Acesso criado",
  cadastro_incompleto: "Cadastro incompleto",
  aguardando_envio: "Aguardando envio",
  em_analise: "Em análise",
  pendente_correcao: "Pendente de correção",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  bloqueado: "Bloqueado",
  documentacao_vencida: "Documentação vencida",
};

export const SUPPLIER_STATUS_BADGE: Record<SupplierStatus, string> = {
  rascunho: "bg-muted text-muted-foreground border-border",
  convidado: "bg-sky-50 text-sky-700 border-sky-200",
  acesso_criado: "bg-blue-50 text-blue-700 border-blue-200",
  cadastro_incompleto: "bg-amber-50 text-amber-700 border-amber-200",
  aguardando_envio: "bg-amber-50 text-amber-700 border-amber-200",
  em_analise: "bg-blue-50 text-blue-700 border-blue-200",
  pendente_correcao: "bg-orange-50 text-orange-700 border-orange-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reprovado: "bg-red-50 text-red-700 border-red-200",
  bloqueado: "bg-red-100 text-red-800 border-red-300",
  documentacao_vencida: "bg-rose-50 text-rose-700 border-rose-200",
};

/** Statuses where supplier cannot yet act on quotes/orders/invoices */
export const SUPPLIER_RESTRICTED_STATUSES: SupplierStatus[] = [
  "rascunho", "convidado", "acesso_criado", "cadastro_incompleto",
  "aguardando_envio", "em_analise", "pendente_correcao",
  "reprovado", "bloqueado", "documentacao_vencida",
];

export function isSupplierApproved(status?: string | null, manualOverride?: boolean): boolean {
  if (manualOverride) return true;
  return status === "aprovado";
}

export type SupplierDocStatus =
  | "nao_enviado" | "enviado" | "em_analise" | "aprovado" | "reprovado" | "vencido";

export const DOC_STATUS_LABEL: Record<SupplierDocStatus, string> = {
  nao_enviado: "Não enviado",
  enviado: "Enviado",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  vencido: "Vencido",
};

export const DOC_STATUS_BADGE: Record<SupplierDocStatus, string> = {
  nao_enviado: "bg-muted text-muted-foreground border-border",
  enviado: "bg-blue-50 text-blue-700 border-blue-200",
  em_analise: "bg-indigo-50 text-indigo-700 border-indigo-200",
  aprovado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reprovado: "bg-red-50 text-red-700 border-red-200",
  vencido: "bg-rose-50 text-rose-700 border-rose-200",
};

export type SupplierInvoiceStatus =
  | "aguardando_envio" | "enviada" | "em_analise" | "aprovada" | "recusada" | "pagamento_liberado";

export const INVOICE_STATUS_LABEL: Record<SupplierInvoiceStatus, string> = {
  aguardando_envio: "Aguardando envio",
  enviada: "Enviada",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  recusada: "Recusada",
  pagamento_liberado: "Pagamento liberado",
};

export const INVOICE_STATUS_BADGE: Record<SupplierInvoiceStatus, string> = {
  aguardando_envio: "bg-muted text-muted-foreground border-border",
  enviada: "bg-blue-50 text-blue-700 border-blue-200",
  em_analise: "bg-indigo-50 text-indigo-700 border-indigo-200",
  aprovada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  recusada: "bg-red-50 text-red-700 border-red-200",
  pagamento_liberado: "bg-teal-50 text-teal-700 border-teal-200",
};

export const TIPO_FORNECEDOR_LABEL: Record<string, string> = {
  produto: "Produto",
  servico: "Serviço",
  ambos: "Produto e Serviço",
};

export const INVITATION_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  usado: "Usado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

export const INVITATION_STATUS_BADGE: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  usado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expirado: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-red-50 text-red-700 border-red-200",
};

/** Categorias padrão de fornecimento */
export const SUPPLIER_CATEGORIES = SUPPLIER_CATEGORY_OPTIONS.map((option) => option.label);

/** Templates de documentos obrigatórios */
export interface DocTemplate { tipo: string; nome: string; obrigatorio: boolean; grupo: string; precisaValidade?: boolean; }
export const DEFAULT_DOCUMENT_TEMPLATES: DocTemplate[] = [
  { tipo: "cnpj_card", nome: "Cartão CNPJ", obrigatorio: true, grupo: "cadastrais" },
  { tipo: "contrato_social", nome: "Contrato social / Estatuto", obrigatorio: true, grupo: "cadastrais" },
  { tipo: "cnd_federal", nome: "CND Federal", obrigatorio: true, grupo: "fiscais", precisaValidade: true },
  { tipo: "cnd_estadual", nome: "CND Estadual", obrigatorio: true, grupo: "fiscais", precisaValidade: true },
  { tipo: "cnd_municipal", nome: "CND Municipal", obrigatorio: true, grupo: "fiscais", precisaValidade: true },
  { tipo: "fgts", nome: "Certidão FGTS", obrigatorio: true, grupo: "fiscais", precisaValidade: true },
  { tipo: "cndt", nome: "CNDT (Trabalhista)", obrigatorio: true, grupo: "fiscais", precisaValidade: true },
  { tipo: "alvara", nome: "Alvará de funcionamento", obrigatorio: false, grupo: "operacionais", precisaValidade: true },
  { tipo: "comprovante_endereco", nome: "Comprovante de endereço", obrigatorio: false, grupo: "cadastrais" },
];

export const SUPPLIER_TIPOS = [
  { value: "produto", label: "Produto" },
  { value: "servico", label: "Serviço" },
  { value: "ambos", label: "Produto e Serviço" },
];

export const SUPPLIER_PORTES = [
  { value: "mei", label: "MEI" },
  { value: "me", label: "Microempresa (ME)" },
  { value: "epp", label: "Empresa de Pequeno Porte (EPP)" },
  { value: "medio", label: "Médio porte" },
  { value: "grande", label: "Grande porte" },
];

export const SUPPLIER_REGIMES = [
  { value: "simples", label: "Simples Nacional" },
  { value: "presumido", label: "Lucro Presumido" },
  { value: "real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
];

/** Campos cuja alteração exige aprovação interna (change request) */
export const CRITICAL_SUPPLIER_FIELDS = new Set<string>([
  "razao_social", "cnpj", "inscricao_estadual", "inscricao_municipal",
  "regime_tributario", "tipo_fornecedor", "porte",
  "email", "banco_nome", "banco_agencia", "banco_conta",
]);

/** Etapas do cadastro completo (8 passos) */
export const SUPPLIER_REGISTRATION_STEPS = [
  { key: "empresa", label: "Dados da empresa" },
  { key: "endereco", label: "Endereço" },
  { key: "contatos", label: "Contatos" },
  { key: "bancario", label: "Dados bancários" },
  { key: "categorias", label: "Categorias" },
  { key: "documentos", label: "Documentos" },
  { key: "declaracoes", label: "Declarações" },
  { key: "revisao", label: "Revisão e envio" },
] as const;
