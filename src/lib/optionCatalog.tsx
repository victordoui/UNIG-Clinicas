import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  FileQuestion,
  FileText,
  Gavel,
  HardHat,
  HelpCircle,
  Home,
  Laptop,
  ListFilter,
  Package,
  PackageCheck,
  PackageSearch,
  PackageX,
  Receipt,
  RotateCcw,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

export type OptionDomain =
  | "productCategory"
  | "institutionalSector"
  | "ciRequestType"
  | "supplierCategory"
  | "role"
  | "priority"
  | "status"
  | "dateRange"
  | "generic";

export interface OptionMeta {
  value: string;
  label: string;
  icon: LucideIcon;
  className: string;
  dotClassName: string;
  badgeClassName: string;
  aliases?: string[];
}

const tone = {
  blue: {
    className: "text-blue-700 dark:text-blue-300",
    dotClassName: "bg-blue-500",
    badgeClassName: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  sky: {
    className: "text-sky-700 dark:text-sky-300",
    dotClassName: "bg-sky-500",
    badgeClassName: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  cyan: {
    className: "text-cyan-700 dark:text-cyan-300",
    dotClassName: "bg-cyan-500",
    badgeClassName: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  },
  teal: {
    className: "text-teal-700 dark:text-teal-300",
    dotClassName: "bg-teal-500",
    badgeClassName: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
  },
  emerald: {
    className: "text-emerald-700 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
    badgeClassName: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  green: {
    className: "text-green-700 dark:text-green-300",
    dotClassName: "bg-green-500",
    badgeClassName: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  },
  amber: {
    className: "text-amber-700 dark:text-amber-300",
    dotClassName: "bg-amber-500",
    badgeClassName: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  orange: {
    className: "text-orange-700 dark:text-orange-300",
    dotClassName: "bg-orange-500",
    badgeClassName: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  },
  red: {
    className: "text-red-700 dark:text-red-300",
    dotClassName: "bg-red-500",
    badgeClassName: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  },
  rose: {
    className: "text-rose-700 dark:text-rose-300",
    dotClassName: "bg-rose-500",
    badgeClassName: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  purple: {
    className: "text-purple-700 dark:text-purple-300",
    dotClassName: "bg-purple-500",
    badgeClassName: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  violet: {
    className: "text-violet-700 dark:text-violet-300",
    dotClassName: "bg-violet-500",
    badgeClassName: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  },
  indigo: {
    className: "text-indigo-700 dark:text-indigo-300",
    dotClassName: "bg-indigo-500",
    badgeClassName: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  },
  slate: {
    className: "text-slate-700 dark:text-slate-300",
    dotClassName: "bg-slate-500",
    badgeClassName: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
  muted: {
    className: "text-muted-foreground",
    dotClassName: "bg-muted-foreground",
    badgeClassName: "bg-muted text-muted-foreground border-border",
  },
} as const;

type ToneName = keyof typeof tone;

function meta(value: string, label: string, icon: LucideIcon, toneName: ToneName, aliases: string[] = []): OptionMeta {
  return { value, label, icon, aliases, ...tone[toneName] };
}

export const PRODUCT_CATEGORY_OPTIONS = [
  meta("eletronicos", "Eletrônicos", Laptop, "sky", ["eletronico", "eletrônico", "eletronicos", "eletrônicos"]),
  meta("escritorio", "Escritório", Briefcase, "slate", [
    "escritorio",
    "escritório",
    "material escritorio",
    "material escritório",
    "material de escritorio",
    "material de escritório",
  ]),
  meta("limpeza", "Limpeza", Sparkles, "green", [
    "limpeza e conservacao",
    "limpeza e conservação",
    "servicos gerais",
    "serviços gerais",
  ]),
  meta("manutencao", "Manutenção", Wrench, "orange", [
    "manutencao",
    "manutenção",
    "manutencao predial",
    "manutenção predial",
    "infraestrutura",
  ]),
  meta("cozinha", "Cozinha", Home, "red"),
  meta("outros", "Outros", HelpCircle, "purple", ["outro", "outros"]),
] as const;

export const INSTITUTIONAL_SECTOR_OPTIONS = [
  meta("compras", "Compras", ShoppingCart, "blue", ["compra"]),
  meta("almoxarifado", "Almoxarifado", Warehouse, "amber"),
  meta("financeiro", "Financeiro", Banknote, "green"),
  meta("ti", "TI", Laptop, "indigo", ["informatica", "informática", "ti / telecom", "tecnologia"]),
  meta("rh", "RH", Users, "purple", ["recursos humanos"]),
  meta("juridico", "Jurídico", Gavel, "red", ["juridico", "jurídico"]),
  meta("administrativo", "Administrativo", Building2, "slate", ["administracao", "administração"]),
  meta("laboratorios", "Laboratórios", FileQuestion, "orange", [
    "laboratorio",
    "laboratório",
    "laboratorios",
    "laboratórios",
  ]),
  meta("biblioteca", "Biblioteca", BookOpen, "indigo"),
  meta("coordenacoes_integradas", "Coordenações Integradas", ClipboardList, "cyan", [
    "coordenacoes integradas",
    "coordenações integradas",
  ]),
] as const;

export const CI_REQUEST_TYPE_OPTIONS = [
  meta("Compra de material", "Compra de material", ShoppingCart, "blue", ["material"]),
  meta("Compra de equipamento", "Compra de equipamento", PackageSearch, "sky", ["equipamento"]),
  meta("Serviço", "Serviço", Wrench, "orange", ["servico", "serviço", "servicos", "serviços"]),
  meta("Informática", "Informática", Laptop, "indigo", ["informatica", "informática", "ti"]),
  meta("Laboratório", "Laboratório", FileQuestion, "orange", [
    "laboratorio",
    "laboratório",
    "laboratorios",
    "laboratórios",
  ]),
  meta("Material de escritório", "Material de escritório", Briefcase, "slate", [
    "escritorio",
    "escritório",
    "material de escritorio",
  ]),
  meta("Infraestrutura", "Infraestrutura", HardHat, "amber"),
  meta("Manutenção", "Manutenção", Wrench, "orange", ["manutencao", "manutenção"]),
  meta("Outro", "Outro", HelpCircle, "muted", ["outros"]),
] as const;

export const SUPPLIER_CATEGORY_OPTIONS = [
  meta("Construção civil", "Construção civil", HardHat, "amber", ["construcao civil", "construção civil"]),
  meta("Elétrica / Hidráulica", "Elétrica / Hidráulica", Wrench, "orange", [
    "eletrica / hidraulica",
    "elétrica / hidráulica",
  ]),
  meta("Equipamentos de obra", "Equipamentos de obra", Package, "sky"),
  meta("Material de escritório", "Material de escritório", Briefcase, "slate", [
    "escritorio",
    "escritório",
    "material de escritorio",
  ]),
  meta("TI / Telecom", "TI / Telecom", Laptop, "indigo", ["ti", "informatica", "informática"]),
  meta("Serviços gerais", "Serviços gerais", Sparkles, "green", ["servicos gerais", "serviços gerais"]),
  meta("Limpeza e conservação", "Limpeza e conservação", Sparkles, "green", [
    "limpeza",
    "limpeza e conservacao",
  ]),
  meta("Manutenção predial", "Manutenção predial", Wrench, "orange", [
    "manutencao predial",
    "manutenção predial",
    "manutencao",
    "manutenção",
  ]),
  meta("Segurança", "Segurança", ShieldCheck, "rose", ["seguranca", "segurança"]),
  meta("Transportes / Logística", "Transportes / Logística", Truck, "teal", [
    "transportes / logistica",
    "transportes / logística",
    "logistica",
    "logística",
  ]),
  meta("Consultoria", "Consultoria", FileText, "purple"),
  meta("Outros", "Outros", HelpCircle, "muted", ["outro"]),
] as const;

export const ROLE_OPTIONS = [
  meta("super_admin", "Super Admin", ShieldCheck, "purple"),
  meta("administrador", "Administrador", Shield, "blue"),
  meta("coordenador_operacoes", "Coordenador de Operações", ClipboardList, "indigo", [
    "coordenador de operacoes",
    "coordenador de operações",
  ]),
  meta("gerente_geral", "Gerente Geral", Briefcase, "purple"),
  meta("engenheira", "Engenheira", HardHat, "cyan"),
  meta("validador_regulatorio", "Validador Regulatório", ShieldCheck, "rose", [
    "regulatorio",
    "regulatório",
  ]),
  meta("conselho", "Conselho", Gavel, "violet"),
  meta("compras", "Compras", ShoppingCart, "blue"),
  meta("almoxarifado", "Almoxarifado", Warehouse, "amber"),
  meta("solicitante", "Solicitante", FileText, "sky"),
  meta("fornecedor", "Fornecedor", Truck, "teal"),
  meta("visitante", "Visitante", User, "muted"),
  meta("organization_admin", "Administrador", Shield, "blue"),
  meta("user", "Usuário", User, "muted", ["usuario", "usuário"]),
] as const;

export const PRIORITY_OPTIONS = [
  meta("baixa", "Baixa", CheckCircle2, "green", ["low"]),
  meta("media", "Média", Clock, "amber", ["média", "medio", "médio", "medium"]),
  meta("normal", "Normal", Clock, "blue", ["regular"]),
  meta("alta", "Alta", AlertCircle, "orange", ["high"]),
  meta("urgente", "Urgente", AlertCircle, "red", ["urgent", "critica", "crítica"]),
] as const;

export const STATUS_OPTIONS = [
  meta("all", "Todos", ListFilter, "muted", ["todas", "todos"]),
  meta("none", "Nenhum", PackageX, "muted", [
    "sem vinculo",
    "sem vínculo",
    "sem avaliacao",
    "sem avaliação",
  ]),
  meta("active", "Ativo", CheckCircle2, "emerald", ["ativo"]),
  meta("inactive", "Inativo", AlertCircle, "muted", ["inativo"]),
  meta("pendente", "Pendente", Clock, "amber"),
  meta("em_analise", "Em análise", PackageSearch, "blue", ["em analise", "em análise"]),
  meta("aprovado", "Aprovado", CheckCircle2, "emerald", ["aprovada"]),
  meta("reprovado", "Reprovado", AlertCircle, "red", ["reprovada"]),
  meta("cancelado", "Cancelado", PackageX, "red", ["cancelada"]),
  meta("rascunho", "Rascunho", FileText, "muted"),
  meta("convidado", "Convidado", UserPlus, "sky"),
  meta("usado", "Usado", UserCheck, "emerald"),
  meta("expirado", "Expirado", Clock, "muted"),
  meta("entrada", "Entrada", PackageCheck, "emerald"),
  meta("saida", "Saída", PackageX, "red", ["saída"]),
  meta("ajuste", "Ajuste", RotateCcw, "amber"),
  meta("ok", "Normal", CheckCircle2, "emerald"),
  meta("baixo", "Baixo", AlertCircle, "amber"),
  meta("critico", "Crítico", AlertCircle, "red", ["crítico"]),
  meta("produto", "Produto", Package, "sky"),
  meta("servico", "Serviço", Wrench, "orange", ["serviço"]),
  meta("ambos", "Produto e Serviço", PackageCheck, "teal", ["produto e serviço"]),
] as const;

export const DATE_RANGE_OPTIONS = [
  meta("7d", "Últimos 7 dias", CalendarDays, "blue"),
  meta("30d", "Últimos 30 dias", CalendarDays, "blue"),
  meta("3m", "Últimos 3 meses", CalendarDays, "indigo"),
  meta("6m", "Últimos 6 meses", CalendarDays, "indigo"),
  meta("1y", "Último ano", CalendarDays, "purple"),
  meta("custom", "Período customizado", CalendarDays, "amber"),
] as const;

export const OPTION_CATALOG: Record<OptionDomain, readonly OptionMeta[]> = {
  productCategory: PRODUCT_CATEGORY_OPTIONS,
  institutionalSector: INSTITUTIONAL_SECTOR_OPTIONS,
  ciRequestType: CI_REQUEST_TYPE_OPTIONS,
  supplierCategory: SUPPLIER_CATEGORY_OPTIONS,
  role: ROLE_OPTIONS,
  priority: PRIORITY_OPTIONS,
  status: STATUS_OPTIONS,
  dateRange: DATE_RANGE_OPTIONS,
  generic: [],
};

export const OPTION_DOMAINS: OptionDomain[] = [
  "productCategory",
  "institutionalSector",
  "ciRequestType",
  "supplierCategory",
  "role",
  "priority",
  "status",
  "dateRange",
];

function normalizeOptionKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._\s-]+/g, "_");
}

function candidatesFor(option: OptionMeta) {
  return [option.value, option.label, ...(option.aliases ?? [])].map(normalizeOptionKey);
}

export function getOptions(domain: OptionDomain) {
  return OPTION_CATALOG[domain] ?? [];
}

export function getOptionMeta(domain: OptionDomain, value: unknown, fallbackLabel?: string): OptionMeta {
  const normalizedValue = normalizeOptionKey(value);
  const direct = getOptions(domain).find((option) => candidatesFor(option).includes(normalizedValue));
  if (direct) return direct;

  if (domain !== "generic") {
    const crossDomain = OPTION_DOMAINS
      .flatMap((optionDomain) => getOptions(optionDomain))
      .find((option) => candidatesFor(option).includes(normalizedValue));
    if (crossDomain) return crossDomain;
  }

  return getFallbackOptionMeta(value, fallbackLabel);
}

export function getOptionMetaAny(value: unknown, fallbackLabel?: string): OptionMeta {
  const normalizedValue = normalizeOptionKey(value);
  const normalizedLabel = normalizeOptionKey(fallbackLabel);
  const crossDomain = OPTION_DOMAINS
    .flatMap((optionDomain) => getOptions(optionDomain))
    .find((option) => {
      const candidates = candidatesFor(option);
      return candidates.includes(normalizedValue) || (!!fallbackLabel && candidates.includes(normalizedLabel));
    });

  return crossDomain ?? getFallbackOptionMeta(value, fallbackLabel);
}

export function getFallbackOptionMeta(value: unknown, fallbackLabel?: string): OptionMeta {
  const label = fallbackLabel || String(value ?? "").trim() || "Selecionar";
  const normalized = normalizeOptionKey(`${value} ${label}`);
  const fallback =
    normalized.includes("user") || normalized.includes("usuario") ? meta(String(value ?? ""), label, UserCog, "slate") :
    normalized.includes("produto") || normalized.includes("product") ? meta(String(value ?? ""), label, Package, "sky") :
    normalized.includes("pedido") || normalized.includes("order") ? meta(String(value ?? ""), label, Receipt, "blue") :
    normalized.includes("fornecedor") || normalized.includes("supplier") ? meta(String(value ?? ""), label, Truck, "teal") :
    normalized.includes("pagamento") || normalized.includes("payment") ? meta(String(value ?? ""), label, CreditCard, "green") :
    normalized.includes("data") || normalized.includes("dia") || normalized.includes("mes") ? meta(String(value ?? ""), label, CalendarDays, "indigo") :
    meta(String(value ?? ""), label, Tag, "muted");

  return fallback;
}

export function productCategoryValues() {
  return PRODUCT_CATEGORY_OPTIONS.map((option) => option.value);
}
