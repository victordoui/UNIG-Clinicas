import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import type { UnigRole } from '@/lib/unigRoles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowRoles?: UnigRole[];
}

export function ProtectedRoute({ children, allowRoles }: ProtectedRouteProps) {
  const { user, loading, unigRole, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowRoles && allowRoles.length > 0 && !isSuperAdmin && !allowRoles.includes(unigRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
