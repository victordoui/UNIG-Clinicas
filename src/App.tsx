import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  BookOpen, CalendarDays, FileText, DollarSign, FileBadge, Megaphone,
  Users, School, Layers3, MapPinned, Map, Building2, Settings, ShieldCheck,
  BarChart3, Bell, ClipboardList, ScrollText, GraduationCap, Package,
  MessageSquare, Home as HomeIcon,
} from 'lucide-react';
import Auth from './pages/Auth';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Install from './pages/Install';
import AlunoPerfil from './pages/aluno/Perfil';
import AlunoDisciplinas from './pages/aluno/Disciplinas';
import AlunoGrade from './pages/aluno/Grade';
import AlunoNotas from './pages/aluno/Notas';
import AlunoDocumentos from './pages/aluno/Documentos';
import Placeholder from './pages/Placeholder';
import MeusRequerimentos from './pages/requerimentos/MeusRequerimentos';
import NovoRequerimento from './pages/requerimentos/NovoRequerimento';
import RequerimentoDetalhe from './pages/requerimentos/RequerimentoDetalhe';
import FilaRequerimentos from './pages/atendimento/FilaRequerimentos';
import HistoricoAluno from './pages/atendimento/HistoricoAluno';
import AcademicoAlunos from './pages/academico/Alunos';
import AcademicoProfessores from './pages/academico/Professores';
import AcademicoCursos from './pages/academico/Cursos';
import AcademicoDisciplinas from './pages/academico/Disciplinas';
import AcademicoTurmas from './pages/academico/Turmas';
import AcademicoMatriz from './pages/academico/Matriz';
import AcademicoAulas from './pages/academico/Aulas';
import ProfessorTurmas from './pages/professor/MinhasTurmas';
import ProfessorLancarNotas from './pages/professor/LancarNotas';
import ProfessorFrequencia from './pages/professor/RegistrarFrequencia';
import ProfessorGrade from './pages/professor/GradeSemanal';

const queryClient = new QueryClient();

const P = (title: string, description: string, icon: any) =>
  <ProtectedRoute><Placeholder title={title} description={description} icon={icon} /></ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="uniga-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />

            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

            {/* Portal do Aluno */}
            <Route path="/aluno/disciplinas" element={<ProtectedRoute><AlunoDisciplinas /></ProtectedRoute>} />
            <Route path="/aluno/grade" element={<ProtectedRoute><AlunoGrade /></ProtectedRoute>} />
            <Route path="/aluno/notas" element={<ProtectedRoute><AlunoNotas /></ProtectedRoute>} />
            <Route path="/aluno/financeiro" element={P('Financeiro','Mensalidades, boletos e bolsas.', DollarSign)} />
            <Route path="/aluno/documentos" element={<ProtectedRoute><AlunoDocumentos /></ProtectedRoute>} />
            <Route path="/aluno/perfil" element={<ProtectedRoute><AlunoPerfil /></ProtectedRoute>} />

            {/* Portal do Professor */}
            <Route path="/professor/turmas" element={P('Minhas Turmas','Turmas em que você leciona.', Users)} />
            <Route path="/professor/grade" element={P('Grade Semanal','Sua agenda semanal de aulas.', CalendarDays)} />

            {/* Requerimentos */}
            <Route path="/requerimentos" element={<ProtectedRoute><MeusRequerimentos /></ProtectedRoute>} />
            <Route path="/requerimentos/novo" element={<ProtectedRoute><NovoRequerimento /></ProtectedRoute>} />
            <Route path="/requerimentos/:id" element={<ProtectedRoute><RequerimentoDetalhe /></ProtectedRoute>} />

            {/* Atendimento */}
            <Route path="/atendimento/requerimentos" element={<ProtectedRoute><FilaRequerimentos /></ProtectedRoute>} />
            <Route path="/atendimento/historico" element={<ProtectedRoute><HistoricoAluno /></ProtectedRoute>} />

            {/* Acadêmico */}
            <Route path="/academico/alunos" element={<ProtectedRoute><AcademicoAlunos /></ProtectedRoute>} />
            <Route path="/academico/professores" element={<ProtectedRoute><AcademicoProfessores /></ProtectedRoute>} />
            <Route path="/academico/cursos" element={<ProtectedRoute><AcademicoCursos /></ProtectedRoute>} />
            <Route path="/academico/disciplinas" element={<ProtectedRoute><AcademicoDisciplinas /></ProtectedRoute>} />
            <Route path="/academico/turmas" element={<ProtectedRoute><AcademicoTurmas /></ProtectedRoute>} />
            <Route path="/academico/matriz" element={<ProtectedRoute><AcademicoMatriz /></ProtectedRoute>} />
            <Route path="/academico/aulas" element={<ProtectedRoute><AcademicoAulas /></ProtectedRoute>} />

            {/* Espaços */}
            <Route path="/espacos" element={P('Dashboard de Espaços','Visão consolidada de reservas e ocupação.', MapPinned)} />
            <Route path="/espacos/agenda" element={P('Agenda','Calendário de reservas, aulas e eventos.', CalendarDays)} />
            <Route path="/espacos/salas" element={P('Salas','Cadastro e status das salas físicas.', MapPinned)} />
            <Route path="/espacos/mapa" element={P('Mapa de Salas','Visualização visual da ocupação.', Map)} />
            <Route path="/espacos/solicitar" element={P('Solicitar Espaço','Solicite uma sala ou espaço.', FileText)} />
            <Route path="/espacos/solicitacoes" element={P('Solicitações de Espaço','Analise e aprove pedidos de sala.', FileText)} />
            <Route path="/espacos/reservas" element={P('Reservas','Reservas confirmadas.', CalendarDays)} />
            <Route path="/espacos/eventos" element={P('Eventos','Eventos institucionais da unidade.', Package)} />

            {/* Comunicação */}
            <Route path="/comunicados" element={P('Comunicados','Comunicados institucionais.', Megaphone)} />
            <Route path="/comunicacao/comunicados" element={P('Gestão de Comunicados','Publique comunicados para alunos, docentes ou unidade.', Megaphone)} />
            <Route path="/comunicacao/notificacoes" element={P('Notificações','Notificações internas do sistema.', Bell)} />
            <Route path="/comunicacao/mensagens" element={P('Mensagens','Mensagens diretas.', MessageSquare)} />

            {/* Financeiro */}
            <Route path="/financeiro/mensalidades" element={P('Mensalidades','Gestão de mensalidades.', DollarSign)} />
            <Route path="/financeiro/boletos" element={P('Boletos','Boletos ativos e histórico.', FileText)} />
            <Route path="/financeiro/bolsas" element={P('Bolsas','Programas de bolsas e descontos.', GraduationCap)} />
            <Route path="/financeiro/relatorios" element={P('Relatórios Financeiros','Indicadores financeiros consolidados.', BarChart3)} />

            {/* Relatórios */}
            <Route path="/relatorios/academicos" element={P('Relatórios Acadêmicos','Alunos, cursos, turmas, notas e frequência.', BarChart3)} />
            <Route path="/relatorios/operacionais" element={P('Relatórios Operacionais','Atendimento, requerimentos e SLA.', BarChart3)} />
            <Route path="/relatorios/ocupacao" element={P('Ocupação de Salas','Uso de salas por bloco, turno e período.', BarChart3)} />

            {/* Administração */}
            <Route path="/admin/usuarios" element={P('Usuários','Gerencie usuários e vínculos.', Users)} />
            <Route path="/admin/permissoes" element={P('Perfis e Permissões','Matriz de permissões por módulo.', ShieldCheck)} />
            <Route path="/admin/unidades" element={P('Unidades','Cadastro de unidades e campi.', Building2)} />
            <Route path="/admin/configuracoes" element={P('Configurações Gerais','Configurações do sistema.', Settings)} />
            <Route path="/admin/logs" element={P('Logs do Sistema','Auditoria e histórico de ações.', ScrollText)} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
