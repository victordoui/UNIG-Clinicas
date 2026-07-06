import { useEffect } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'gerente' | 'usuario';
  requireSuperAdmin?: boolean;
  requireCouncilMember?: boolean;
  blockUnigRoles?: string[];
}

// Rotas permitidas ao papel "solicitante" (qualquer outra rota redireciona p/ /unigops/ci/public)
const SOLICITANTE_ALLOWED_PATTERNS = [
  '/dashboard',
  '/',
  '/change-password',
  '/configuracoes',
  '/unigops/ci',
  '/unigops/ci/public',
  '/unigops/ci/chatbot',
  '/unigops/ci/formulario',
  '/unigops/ci/consulta',
  '/unigops/ci/consulta/:protocolo',
  '/unigops/ci/acompanhamentos',
  '/unigops/ci/base-conhecimento',
  '/unigops/ci/avisos',
  '/unigops/ci/imprimir/:protocolo',
  '/dashboard/ci/formulario',
  '/dashboard/ci/chatbot',
  '/dashboard/ci/minhas',
  '/dashboard/ci/:id',
  '/dashboard/ci/:id/imprimir',
  '/solicitacoes/minhas',
  '/solicitacoes/:id',
];

// Rotas adicionais permitidas ao papel "gestor" (Solicitante + Central de Demandas)
const GESTOR_EXTRA_ALLOWED_PATTERNS = [
  '/demandas',
  '/demandas/lista',
  '/demandas/nova',
  '/demandas/:id',
  '/demandas/relatorios',
];

// Rotas permitidas ao papel "patrimonio" (isolado ao módulo de Patrimônio)
const PATRIMONIO_ALLOWED_PATTERNS = [
  '/dashboard',
  '/',
  '/change-password',
  '/configuracoes',
  '/patrimonio',
  '/patrimonio/novo',
  '/patrimonio/categorias',
  '/patrimonio/inventario',
  '/patrimonio/movimentacoes',
  '/patrimonio/etiquetas',
  '/patrimonio/importacao',
  '/patrimonio/relatorios',
  '/patrimonio/:id',
  '/patrimonio/:id/editar',
];


// Rotas permitidas ao papel "visitante" (acesso cru, aguardando atribuição)
const VISITANTE_ALLOWED_PATTERNS = [
  '/dashboard',
  '/',
  '/change-password',
  '/configuracoes',
];

function isSolicitanteAllowed(pathname: string) {
  return SOLICITANTE_ALLOWED_PATTERNS.some((p) => matchPath({ path: p, end: true }, pathname));
}

function isGestorAllowed(pathname: string) {
  return (
    isSolicitanteAllowed(pathname) ||
    GESTOR_EXTRA_ALLOWED_PATTERNS.some((p) => matchPath({ path: p, end: true }, pathname))
  );
}

function isVisitanteAllowed(pathname: string) {
  return VISITANTE_ALLOWED_PATTERNS.some((p) => matchPath({ path: p, end: true }, pathname));
}

function isPatrimonioAllowed(pathname: string) {
  return PATRIMONIO_ALLOWED_PATTERNS.some((p) => matchPath({ path: p, end: true }, pathname));
}


export function ProtectedRoute({ children, requiredRole, requireSuperAdmin, requireCouncilMember, blockUnigRoles }: ProtectedRouteProps) {
  const { user, profile, currentRole, loading, isSuperAdmin, isCouncilMember, passwordChangeRequired, unigRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSupplierRedirect =
    !loading &&
    !!user &&
    unigRole === 'fornecedor' &&
    !location.pathname.startsWith('/portal-fornecedor') &&
    location.pathname !== '/change-password';

  const isSolicitanteRedirect =
    !loading &&
    !!user &&
    !isSuperAdmin &&
    unigRole === 'solicitante' &&
    !location.pathname.startsWith('/portal-fornecedor') &&
    !isSolicitanteAllowed(location.pathname);

  const isVisitanteRedirect =
    !loading &&
    !!user &&
    !isSuperAdmin &&
    unigRole === 'visitante' &&
    !location.pathname.startsWith('/portal-fornecedor') &&
    !isVisitanteAllowed(location.pathname);

  const isPatrimonioRedirect =
    !loading &&
    !!user &&
    !isSuperAdmin &&
    unigRole === 'patrimonio' &&
    !location.pathname.startsWith('/portal-fornecedor') &&
    !isPatrimonioAllowed(location.pathname);

  const isBlockedUnigRoleRedirect =
    !loading &&
    !!user &&
    !isSuperAdmin &&
    !!blockUnigRoles &&
    !!unigRole &&
    blockUnigRoles.includes(unigRole);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && profile && requiredRole) {
      const roleHierarchy = { admin: 3, gerente: 2, usuario: 1 };
      const userLevel = roleHierarchy[currentRole];
      const requiredLevel = roleHierarchy[requiredRole];
      
      if (userLevel < requiredLevel) {
        navigate('/dashboard');
      }
    }
  }, [user, profile, currentRole, loading, requiredRole, navigate]);

  useEffect(() => {
    if (!loading && user && requireSuperAdmin && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [user, loading, requireSuperAdmin, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!loading && user && requireCouncilMember && !isCouncilMember && !isSuperAdmin) {
      const canBypassCouncil =
        currentRole === 'admin' ||
        unigRole === 'administrador' ||
        unigRole === 'gerente_geral' ||
        unigRole === 'super_admin' ||
        unigRole === 'conselho';
      if (!canBypassCouncil) {
        navigate('/dashboard');
      }
    }
  }, [user, loading, requireCouncilMember, isCouncilMember, isSuperAdmin, currentRole, unigRole, navigate]);

  useEffect(() => {
    if (!loading && user && passwordChangeRequired && location.pathname !== '/change-password') {
      navigate('/change-password');
    }
  }, [user, loading, passwordChangeRequired, location.pathname, navigate]);

  useEffect(() => {
    if (!loading && user && !isSuperAdmin && blockUnigRoles && unigRole && blockUnigRoles.includes(unigRole)) {
      navigate('/dashboard');
    }
  }, [user, loading, isSuperAdmin, blockUnigRoles, unigRole, navigate]);

  // Supplier portal isolation: suppliers can only access /portal-fornecedor/*
  useEffect(() => {
    if (!loading && user && unigRole === 'fornecedor' && !location.pathname.startsWith('/portal-fornecedor') && location.pathname !== '/change-password') {
      navigate('/portal-fornecedor');
    }
  }, [user, loading, unigRole, location.pathname, navigate]);

  // Solicitante whitelist: bloqueia qualquer rota fora do conjunto permitido
  // (ignora /portal-fornecedor/* para evitar race condition durante carga do supplierLink)
  useEffect(() => {
    if (location.pathname.startsWith('/portal-fornecedor')) return;
    if (!loading && user && !isSuperAdmin && unigRole === 'solicitante' && !isSolicitanteAllowed(location.pathname)) {
      navigate('/unigops/ci/public');
    }
  }, [user, loading, isSuperAdmin, unigRole, location.pathname, navigate]);

  // Gestor whitelist: pode tudo de Solicitante + Central de Demandas
  useEffect(() => {
    if (location.pathname.startsWith('/portal-fornecedor')) return;
    if (!loading && user && !isSuperAdmin && unigRole === 'gestor' && !isGestorAllowed(location.pathname)) {
      navigate('/dashboard');
    }
  }, [user, loading, isSuperAdmin, unigRole, location.pathname, navigate]);

  // Visitante whitelist: acesso cru, aguardando atribuição de papel
  useEffect(() => {
    if (location.pathname.startsWith('/portal-fornecedor')) return;
    if (!loading && user && !isSuperAdmin && unigRole === 'visitante' && !isVisitanteAllowed(location.pathname)) {
      navigate('/dashboard');
    }
  }, [user, loading, isSuperAdmin, unigRole, location.pathname, navigate]);

  // Patrimônio whitelist: acesso isolado às páginas do módulo de Patrimônio
  useEffect(() => {
    if (location.pathname.startsWith('/portal-fornecedor')) return;
    if (!loading && user && !isSuperAdmin && unigRole === 'patrimonio' && !isPatrimonioAllowed(location.pathname)) {
      navigate('/patrimonio');
    }
  }, [user, loading, isSuperAdmin, unigRole, location.pathname, navigate]);


  if (loading || isSupplierRedirect || isSolicitanteRedirect || isVisitanteRedirect || isPatrimonioRedirect || isBlockedUnigRoleRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
