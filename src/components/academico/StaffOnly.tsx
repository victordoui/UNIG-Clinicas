import { useAuth } from '@/hooks/useAuth';
import { isStaff, UnigRole } from '@/lib/unigRoles';

const WRITE_ROLES: UnigRole[] = ['super_admin', 'administrador', 'secretaria', 'coordenacao'];

export function useCanWriteAcademic() {
  const { unigRole } = useAuth();
  return WRITE_ROLES.includes(unigRole);
}

export function useCanReadAcademic() {
  const { unigRole } = useAuth();
  return isStaff(unigRole);
}

export function StaffOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const can = useCanWriteAcademic();
  if (!can) return <>{fallback}</>;
  return <>{children}</>;
}
