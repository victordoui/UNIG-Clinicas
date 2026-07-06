import { Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { OpsAssistChatbot } from '@/components/ci/OpsAssistChatbot';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle } from 'lucide-react';

const CAN_CREATE_CI = ['super_admin', 'administrador', 'coordenador_operacoes', 'gerente_geral', 'solicitante'];

export default function CIChatbotInternal() {
  const { user, unigRole, isSuperAdmin } = useAuth();
  const allowed = isSuperAdmin || (!!unigRole && CAN_CREATE_CI.includes(unigRole));
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4"><MessageCircle className="h-6 w-6 text-primary" /> Chatbot CI — Ops Assist</h1>
        <OpsAssistChatbot channel="interno" createdBy={user?.id ?? null} />
      </div>
    </MainLayout>
  );
}
