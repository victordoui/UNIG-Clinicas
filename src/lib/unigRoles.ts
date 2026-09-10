import {
  ShieldCheck, Shield, ClipboardList, GraduationCap, BookOpen, User,
  DollarSign, Headset, Building2, MapPinned, Eye, type LucideIcon,
} from 'lucide-react';

// Papéis oficiais do sistema UNIG-A
export type UnigRole =
  | 'super_admin'
  | 'administrador'
  | 'secretaria'
  | 'coordenacao'
  | 'professor'
  | 'aluno'
  | 'financeiro'
  | 'atendimento'
  | 'gestor_unidade'
  | 'operador_espacos'
  | 'visitante'; // fallback quando o usuário ainda não tem papel

export const UNIG_ROLE_LABEL: Record<UnigRole, string> = {
  super_admin: 'Super Admin',
  administrador: 'Administrador',
  secretaria: 'Secretaria Acadêmica',
  coordenacao: 'Coordenação de Curso',
  professor: 'Professor',
  aluno: 'Aluno',
  financeiro: 'Financeiro',
  atendimento: 'Atendimento',
  gestor_unidade: 'Gestor de Unidade',
  operador_espacos: 'Operador de Espaços',
  visitante: 'Visitante',
};

export const UNIG_ROLE_ICON: Record<UnigRole, LucideIcon> = {
  super_admin: ShieldCheck,
  administrador: Shield,
  secretaria: ClipboardList,
  coordenacao: GraduationCap,
  professor: BookOpen,
  aluno: User,
  financeiro: DollarSign,
  atendimento: Headset,
  gestor_unidade: Building2,
  operador_espacos: MapPinned,
  visitante: Eye,
};

export const UNIG_ROLE_BADGE: Record<UnigRole, string> = {
  super_admin: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  administrador: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  secretaria: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  coordenacao: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  professor: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  aluno: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  financeiro: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  atendimento: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  gestor_unidade: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30',
  operador_espacos: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  visitante: 'bg-muted text-muted-foreground border-border',
};

export const UNIG_ROLE_TEXT_COLOR: Record<UnigRole, string> = {
  super_admin: 'text-purple-600',
  administrador: 'text-blue-600',
  secretaria: 'text-sky-600',
  coordenacao: 'text-indigo-600',
  professor: 'text-emerald-600',
  aluno: 'text-cyan-600',
  financeiro: 'text-amber-600',
  atendimento: 'text-rose-600',
  gestor_unidade: 'text-fuchsia-600',
  operador_espacos: 'text-teal-600',
  visitante: 'text-muted-foreground',
};

export const ALL_UNIG_ROLES: UnigRole[] = [
  'super_admin',
  'administrador',
  'secretaria',
  'coordenacao',
  'professor',
  'aluno',
  'financeiro',
  'atendimento',
  'gestor_unidade',
  'operador_espacos',
];

// Papéis considerados "equipe" (staff) — usados para permissões amplas de backoffice.
export const STAFF_ROLES: UnigRole[] = [
  'super_admin',
  'administrador',
  'secretaria',
  'coordenacao',
  'financeiro',
  'atendimento',
  'gestor_unidade',
  'operador_espacos',
];

export function isStaff(role: UnigRole | null | undefined) {
  return !!role && STAFF_ROLES.includes(role);
}

export function mapDbRoleToUnig(dbRole: string | null | undefined, isSuperAdmin = false): UnigRole {
  if (isSuperAdmin) return 'super_admin';
  if (!dbRole) return 'visitante';
  const clinicalRoleMap: Record<string, UnigRole> = {
    super_admin: 'super_admin',
    organization_admin: 'administrador',
    clinic_manager: 'gestor_unidade',
    clinician: 'professor',
    academic_supervisor: 'coordenacao',
    student: 'aluno',
    receptionist: 'atendimento',
    auditor: 'financeiro',
  };
  if (clinicalRoleMap[dbRole]) return clinicalRoleMap[dbRole];
  if ((ALL_UNIG_ROLES as string[]).includes(dbRole)) return dbRole as UnigRole;
  return 'visitante';
}

// Usuários demo (acesso rápido de teste na tela de login)
export interface DemoUser {
  role: UnigRole;
  email: string;
  password: string;
  label: string;
  accessGroup: string;
  clinicCode?: string;
  clinicName?: string;
}

export const DEMO_PASSWORD = 'unig1234';

const CLINICS = [
  ['ODONTO', 'Clínica de Odontologia'],
  ['FISIO', 'Clínica de Fisioterapia'],
  ['VET', 'Clínica Veterinária'],
  ['ESTETICA', 'Clínica de Estética'],
] as const;

export const DEMO_USERS: DemoUser[] = [
  {
    role: 'super_admin',
    email: 'super-admin@unig.demo',
    password: DEMO_PASSWORD,
    label: 'Super Admin',
    accessGroup: 'Administração geral',
  },
  {
    role: 'administrador',
    email: 'organization-admin@unig.demo',
    password: DEMO_PASSWORD,
    label: 'Administrador da organização',
    accessGroup: 'Administração geral',
  },
  ...CLINICS.flatMap(([clinicCode, clinicName]) => ([
    {
      role: 'gestor_unidade' as const,
      email: `clinic-manager-${clinicCode.toLowerCase()}@unig.demo`,
      password: DEMO_PASSWORD,
      label: 'Gestor da clínica',
      accessGroup: clinicName,
      clinicCode,
      clinicName,
    },
    {
      role: 'professor' as const,
      email: `clinician-${clinicCode.toLowerCase()}@unig.demo`,
      password: DEMO_PASSWORD,
      label: 'Profissional clínico',
      accessGroup: clinicName,
      clinicCode,
      clinicName,
    },
    {
      role: 'atendimento' as const,
      email: `receptionist-${clinicCode.toLowerCase()}@unig.demo`,
      password: DEMO_PASSWORD,
      label: 'Recepção e fila',
      accessGroup: clinicName,
      clinicCode,
      clinicName,
    },
  ])),
  {
    role: 'coordenacao',
    email: 'academic-supervisor-odonto@unig.demo',
    password: DEMO_PASSWORD,
    label: 'Supervisor acadêmico',
    accessGroup: 'Clínica de Odontologia',
    clinicCode: 'ODONTO',
    clinicName: 'Clínica de Odontologia',
  },
  {
    role: 'aluno',
    email: 'student-odonto@unig.demo',
    password: DEMO_PASSWORD,
    label: 'Estudante',
    accessGroup: 'Clínica de Odontologia',
    clinicCode: 'ODONTO',
    clinicName: 'Clínica de Odontologia',
  },
  {
    role: 'financeiro',
    email: 'auditor@unig.demo',
    password: DEMO_PASSWORD,
    label: 'Auditoria transversal',
    accessGroup: 'Auditoria transversal',
  },
];
