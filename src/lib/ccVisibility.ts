import type { UserCostCenterOption } from '@/hooks/useUserCostCenters';

const PRIVILEGED_ROLES = new Set([
  'super_admin',
  'administrador',
  'coordenador_operacoes',
  'gerente_geral',
  'admin',
  'gerente',
  'compras',
]);

export function isPrivilegedForCC(role?: string | null): boolean {
  return !!role && PRIVILEGED_ROLES.has(role);
}

export function canSeeAllCostCenters(role?: string | null): boolean {
  return isPrivilegedForCC(role);
}

/** IDs of CCs the user can see/filter on. Privileged roles see all (returns null = "no restriction"). */
export function visibleCostCenterIds(
  role: string | undefined | null,
  myCCs: UserCostCenterOption[] | undefined,
): string[] | null {
  if (canSeeAllCostCenters(role)) return null;
  return (myCCs ?? []).map(c => c.id);
}

/** CCs the user manages (can_approve_cc) — used to power "do meu setor" views. */
export function managedCostCenters(myCCs: UserCostCenterOption[] | undefined): UserCostCenterOption[] {
  return (myCCs ?? []).filter(c => c.can_approve_cc);
}

export function isCCManager(role: string | undefined | null, myCCs: UserCostCenterOption[] | undefined): boolean {
  if (isPrivilegedForCC(role)) return true;
  if (role === 'gestor_aprovador') return true;
  return managedCostCenters(myCCs).length > 0;
}
