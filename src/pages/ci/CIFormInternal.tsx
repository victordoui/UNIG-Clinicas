import { Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { CIStaticForm } from '@/components/ci/CIStaticForm';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

const CAN_CREATE_CI = ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'solicitante'];

export default function CIFormInternal() {
  const { user, unigRole, isSuperAdmin } = useAuth();
  const allowed = isSuperAdmin || (!!unigRole && CAN_CREATE_CI.includes(unigRole));
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4"><Plus className="h-6 w-6 text-primary" /> Nova Requisição</h1>
        <CIStaticForm channel="interno" createdBy={user?.id ?? null} />
      </div>
    </MainLayout>
  );
}
