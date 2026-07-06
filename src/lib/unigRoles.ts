import {
  ShieldCheck, Shield, ClipboardList, Briefcase, HardHat, Vote, ShoppingCart,
  Warehouse, FileSignature, Truck, Eye, UserCog, Package, type LucideIcon,
} from 'lucide-react';

export type UnigRole =
  | 'super_admin'
  | 'administrador'
  | 'coordenador_operacoes'
  | 'gerente_geral'
  | 'engenheira'
  | 'validador_regulatorio'
  | 'conselho'
  | 'compras'
  | 'almoxarifado'
  | 'patrimonio'
  | 'gestor'
  | 'solicitante'
  | 'fornecedor'
  | 'visitante';


export const UNIG_ROLE_LABEL: Record<UnigRole, string> = {
  super_admin: 'Super Admin',
  administrador: 'Administrador',
  coordenador_operacoes: 'Coordenador de Operações',
  gerente_geral: 'Gerente Geral',
  engenheira: 'Engenheira',
  validador_regulatorio: 'Validador Regulatório',
  conselho: 'Conselho',
  compras: 'Compras',
  almoxarifado: 'Almoxarifado',
  patrimonio: 'Patrimônio',
  gestor: 'Gestor',
  solicitante: 'Solicitante',
  fornecedor: 'Fornecedor',
  visitante: 'Visitante',

};

export const UNIG_ROLE_BADGE: Record<UnigRole, string> = {
  super_admin: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  administrador: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  coordenador_operacoes: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  gerente_geral: 'bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30',
  engenheira: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  validador_regulatorio: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
  conselho: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  compras: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  almoxarifado: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  patrimonio: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  gestor: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  solicitante: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  fornecedor: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  visitante: 'bg-muted text-muted-foreground border-border',

};

export const UNIG_ROLE_ICON: Record<UnigRole, LucideIcon> = {
  super_admin: ShieldCheck,
  administrador: Shield,
  coordenador_operacoes: ClipboardList,
  gerente_geral: Briefcase,
  engenheira: HardHat,
  validador_regulatorio: ShieldCheck,
  conselho: Vote,
  compras: ShoppingCart,
  almoxarifado: Warehouse,
  patrimonio: Package,
  gestor: UserCog,
  solicitante: FileSignature,
  fornecedor: Truck,
  visitante: Eye,

};

// Cor de texto para o ícone (espelha as cores do badge)
export const UNIG_ROLE_TEXT_COLOR: Record<UnigRole, string> = {
  super_admin: 'text-purple-600',
  administrador: 'text-blue-600',
  coordenador_operacoes: 'text-indigo-600',
  gerente_geral: 'text-fuchsia-600',
  engenheira: 'text-cyan-600',
  validador_regulatorio: 'text-rose-600',
  conselho: 'text-violet-600',
  compras: 'text-emerald-600',
  almoxarifado: 'text-amber-700',
  patrimonio: 'text-blue-700',
  gestor: 'text-orange-600',
  solicitante: 'text-sky-600',
  fornecedor: 'text-teal-700',
  visitante: 'text-muted-foreground',

};

// Papéis atribuíveis pelo Admin via organization_members (exclui super_admin e fornecedor)
export const ASSIGNABLE_UNIG_ROLES: UnigRole[] = [
  'administrador',
  'coordenador_operacoes',
  'gerente_geral',
  'engenheira',
  'validador_regulatorio',
  'conselho',
  'compras',
  'almoxarifado',
  'patrimonio',
  'gestor',
  'solicitante',
  'visitante',
];

// Mantido para compatibilidade — todos os papéis "normais" (não super_admin / não fornecedor)
export const ALL_UNIG_ROLES: UnigRole[] = [
  'administrador',
  'coordenador_operacoes',
  'gerente_geral',
  'engenheira',
  'validador_regulatorio',
  'conselho',
  'compras',
  'almoxarifado',
  'patrimonio',
  'gestor',
  'solicitante',
  'fornecedor',
  'visitante',
];


export function mapDbRoleToUnig(
  dbRole: string | null | undefined,
  isSuperAdmin: boolean,
  isSupplier?: boolean,
  isCouncilMember?: boolean,
): UnigRole {
  if (isSuperAdmin) return 'super_admin';
  if (isSupplier) return 'fornecedor';
  switch (dbRole) {
    case 'organization_admin':
    case 'administrador':
    case 'gestor_aprovador': // legado → admin
    case 'manager': // legado → admin
      return 'administrador';
    case 'coordenador_operacoes':
      return 'coordenador_operacoes';
    case 'gerente_geral':
      return 'gerente_geral';
    case 'engenheira':
      return 'engenheira';
    case 'validador_regulatorio':
      return 'validador_regulatorio';
    case 'conselho':
      return 'conselho';
    case 'compras':
      return 'compras';
    case 'almoxarifado':
      return 'almoxarifado';
    case 'patrimonio':
      return 'patrimonio';
    case 'gestor':
      return 'gestor';
    case 'solicitante':
      return 'solicitante';
    case 'fornecedor':
      return 'fornecedor';

    case 'visitante':
    case 'visualizador': // legado
    case 'user': // legado
      // Membros do conselho sem papel específico assumem o papel "Conselho"
      if (isCouncilMember) return 'conselho';
      return 'visitante';
    default:
      if (isCouncilMember) return 'conselho';
      return 'visitante';
  }
}

export const STAFF_ROLES: UnigRole[] = [
  'super_admin',
  'administrador',
  'coordenador_operacoes',
  'gerente_geral',
  'engenheira',
  'validador_regulatorio',
  'conselho',
  'compras',
  'patrimonio',
];

export function isStaff(role: UnigRole | null | undefined) {
  return !!role && STAFF_ROLES.includes(role);
}

// Papéis que podem agir como Solicitante (abrir CI / RC e acompanhar próprias solicitações).
// Gestor herda as permissões de Solicitante além de poder gerir demandas operacionais.
export const SOLICITANTE_LIKE_ROLES: UnigRole[] = ['solicitante', 'gestor'];

export function canActAsSolicitante(role: UnigRole | null | undefined) {
  return !!role && SOLICITANTE_LIKE_ROLES.includes(role);
}

// Papéis com acesso ao módulo "Central de Demandas e Projetos Operacionais"
export const DEMANDAS_ROLES: UnigRole[] = [
  'super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'gestor',
];

export function canAccessDemandas(role: UnigRole | null | undefined) {
  return !!role && DEMANDAS_ROLES.includes(role);
}

