import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UpdateBanner } from '@/components/pwa/UpdateBanner';

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
import AcademicoVisaoGeral from './pages/academico/VisaoGeral';
import AcademicoCalendario from './pages/academico/Calendario';
import AcademicoEnsalamento from './pages/academico/Ensalamento';
import AcademicoPendencias from './pages/academico/Pendencias';
import AcademicoAnaliseEnsalamento from './pages/academico/AnaliseEnsalamento';
import AcademicoPublicacao from './pages/academico/Publicacao';
import AcademicoHistorico from './pages/academico/Historico';
import AcademicoSalasLivres from './pages/academico/SalasLivres';
import ProfessorTurmas from './pages/professor/MinhasTurmas';
import ProfessorLancarNotas from './pages/professor/LancarNotas';
import ProfessorFrequencia from './pages/professor/RegistrarFrequencia';
import ProfessorGrade from './pages/professor/GradeSemanal';
import EspacosDashboard from './pages/espacos/Dashboard';
import EspacosSalas from './pages/espacos/Salas';
import EspacosMapa from './pages/espacos/Mapa';
import EspacosAgenda from './pages/espacos/Agenda';
import EspacosSolicitacoes from './pages/espacos/Solicitacoes';
import EspacosReservas from './pages/espacos/Reservas';
import EspacosSolicitar from './pages/espacos/Solicitar';
import RelatoriosOcupacao from './pages/relatorios/Ocupacao';
import RelatoriosAcademicos from './pages/relatorios/Academicos';
import RelatoriosOperacionais from './pages/relatorios/Operacionais';
import FinanceiroDashboard from './pages/financeiro/Dashboard';
import FinanceiroMensalidades from './pages/financeiro/Mensalidades';
import FinanceiroBoletos from './pages/financeiro/Boletos';
import FinanceiroBolsas from './pages/financeiro/Bolsas';
import FinanceiroRelatorios from './pages/financeiro/Relatorios';
import AlunoFinanceiro from './pages/aluno/Financeiro';
import ComunicadosFeed from './pages/Comunicados';
import ComunicacaoGestao from './pages/comunicacao/Comunicados';
import ComunicacaoNotificacoes from './pages/comunicacao/Notificacoes';
import ComunicacaoMensagens from './pages/comunicacao/Mensagens';
import AdminUsuarios from './pages/admin/Usuarios';
import AdminPermissoes from './pages/admin/Permissoes';
import AdminConfiguracoes from './pages/admin/Configuracoes';
import AdminLogs from './pages/admin/Logs';
import AdminClinicas from './pages/admin/Clinicas';
import Pacientes from './pages/patients/Pacientes';
import AgendaFila from './pages/care/AgendaFila';

const ADMIN_ROLES = ['super_admin', 'administrador'] as const;

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
          <UpdateBanner />

          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />

            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
            <Route path="/agenda-fila" element={<ProtectedRoute><AgendaFila /></ProtectedRoute>} />

            {/* Portal do Aluno */}
            <Route path="/aluno/disciplinas" element={<ProtectedRoute><AlunoDisciplinas /></ProtectedRoute>} />
            <Route path="/aluno/grade" element={<ProtectedRoute><AlunoGrade /></ProtectedRoute>} />
            <Route path="/aluno/notas" element={<ProtectedRoute><AlunoNotas /></ProtectedRoute>} />
            <Route path="/aluno/financeiro" element={<ProtectedRoute><AlunoFinanceiro /></ProtectedRoute>} />
            <Route path="/aluno/documentos" element={<ProtectedRoute><AlunoDocumentos /></ProtectedRoute>} />
            <Route path="/aluno/perfil" element={<ProtectedRoute><AlunoPerfil /></ProtectedRoute>} />

            {/* Portal do Professor */}
            <Route path="/professor/turmas" element={<ProtectedRoute><ProfessorTurmas /></ProtectedRoute>} />
            <Route path="/professor/turmas/:classId/notas" element={<ProtectedRoute><ProfessorLancarNotas /></ProtectedRoute>} />
            <Route path="/professor/turmas/:classId/frequencia" element={<ProtectedRoute><ProfessorFrequencia /></ProtectedRoute>} />
            <Route path="/professor/grade" element={<ProtectedRoute><ProfessorGrade /></ProtectedRoute>} />

            {/* Requerimentos */}
            <Route path="/requerimentos" element={<ProtectedRoute><MeusRequerimentos /></ProtectedRoute>} />
            <Route path="/requerimentos/novo" element={<ProtectedRoute><NovoRequerimento /></ProtectedRoute>} />
            <Route path="/requerimentos/:id" element={<ProtectedRoute><RequerimentoDetalhe /></ProtectedRoute>} />

            {/* Atendimento */}
            <Route path="/atendimento/requerimentos" element={<ProtectedRoute><FilaRequerimentos /></ProtectedRoute>} />
            <Route path="/atendimento/historico" element={<ProtectedRoute><HistoricoAluno /></ProtectedRoute>} />

            {/* Acadêmico */}
            <Route path="/academico" element={<ProtectedRoute><AcademicoVisaoGeral /></ProtectedRoute>} />
            <Route path="/academico/calendario" element={<ProtectedRoute><AcademicoCalendario /></ProtectedRoute>} />
            <Route path="/academico/alunos" element={<ProtectedRoute><AcademicoAlunos /></ProtectedRoute>} />
            <Route path="/academico/professores" element={<ProtectedRoute><AcademicoProfessores /></ProtectedRoute>} />
            <Route path="/academico/cursos" element={<ProtectedRoute><AcademicoCursos /></ProtectedRoute>} />
            <Route path="/academico/disciplinas" element={<ProtectedRoute><AcademicoDisciplinas /></ProtectedRoute>} />
            <Route path="/academico/turmas" element={<ProtectedRoute><AcademicoTurmas /></ProtectedRoute>} />
            <Route path="/academico/matriz" element={<ProtectedRoute><AcademicoMatriz /></ProtectedRoute>} />
            <Route path="/academico/aulas" element={<ProtectedRoute><AcademicoAulas /></ProtectedRoute>} />
            <Route path="/academico/ensalamento" element={<ProtectedRoute><AcademicoEnsalamento /></ProtectedRoute>} />
            <Route path="/academico/pendencias" element={<ProtectedRoute><AcademicoPendencias /></ProtectedRoute>} />
            <Route path="/academico/analise-ensalamento" element={<ProtectedRoute><AcademicoAnaliseEnsalamento /></ProtectedRoute>} />
            <Route path="/academico/publicacao" element={<ProtectedRoute><AcademicoPublicacao /></ProtectedRoute>} />
            <Route path="/academico/historico" element={<ProtectedRoute><AcademicoHistorico /></ProtectedRoute>} />
            <Route path="/academico/salas-livres" element={<ProtectedRoute><AcademicoSalasLivres /></ProtectedRoute>} />

            {/* Espaços */}
            <Route path="/espacos" element={<ProtectedRoute><EspacosDashboard /></ProtectedRoute>} />
            <Route path="/espacos/agenda" element={<ProtectedRoute><EspacosAgenda /></ProtectedRoute>} />
            <Route path="/espacos/salas" element={<ProtectedRoute><EspacosSalas /></ProtectedRoute>} />
            <Route path="/espacos/mapa" element={<ProtectedRoute><EspacosMapa /></ProtectedRoute>} />
            <Route path="/espacos/solicitar" element={<ProtectedRoute><EspacosSolicitar /></ProtectedRoute>} />
            <Route path="/espacos/solicitacoes" element={<ProtectedRoute><EspacosSolicitacoes /></ProtectedRoute>} />
            <Route path="/espacos/reservas" element={<ProtectedRoute><EspacosReservas /></ProtectedRoute>} />
            <Route path="/espacos/eventos" element={P('Eventos','Eventos institucionais da unidade.', Package)} />


            {/* Comunicação */}
            <Route path="/comunicados" element={<ProtectedRoute><ComunicadosFeed /></ProtectedRoute>} />
            <Route path="/comunicacao/comunicados" element={<ProtectedRoute><ComunicacaoGestao /></ProtectedRoute>} />
            <Route path="/comunicacao/notificacoes" element={<ProtectedRoute><ComunicacaoNotificacoes /></ProtectedRoute>} />
            <Route path="/comunicacao/mensagens" element={<ProtectedRoute><ComunicacaoMensagens /></ProtectedRoute>} />

            {/* Financeiro */}
            <Route path="/financeiro" element={<ProtectedRoute><FinanceiroDashboard /></ProtectedRoute>} />
            <Route path="/financeiro/mensalidades" element={<ProtectedRoute><FinanceiroMensalidades /></ProtectedRoute>} />
            <Route path="/financeiro/boletos" element={<ProtectedRoute><FinanceiroBoletos /></ProtectedRoute>} />
            <Route path="/financeiro/bolsas" element={<ProtectedRoute><FinanceiroBolsas /></ProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<ProtectedRoute><FinanceiroRelatorios /></ProtectedRoute>} />

            {/* Relatórios */}
            <Route path="/relatorios/academicos" element={<ProtectedRoute><RelatoriosAcademicos /></ProtectedRoute>} />
            <Route path="/relatorios/operacionais" element={<ProtectedRoute><RelatoriosOperacionais /></ProtectedRoute>} />
            <Route path="/relatorios/ocupacao" element={<ProtectedRoute><RelatoriosOcupacao /></ProtectedRoute>} />

            {/* Administração */}
            {/* Administração */}
            <Route path="/admin/usuarios" element={<ProtectedRoute allowRoles={[...ADMIN_ROLES]}><AdminUsuarios /></ProtectedRoute>} />
            <Route path="/admin/permissoes" element={<ProtectedRoute allowRoles={[...ADMIN_ROLES]}><AdminPermissoes /></ProtectedRoute>} />
            <Route path="/admin/unidades" element={<ProtectedRoute allowRoles={[...ADMIN_ROLES]}><AdminClinicas /></ProtectedRoute>} />
            <Route path="/admin/clinicas" element={<ProtectedRoute allowRoles={[...ADMIN_ROLES]}><AdminClinicas /></ProtectedRoute>} />
            <Route path="/admin/configuracoes" element={<ProtectedRoute allowRoles={[...ADMIN_ROLES]}><AdminConfiguracoes /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute allowRoles={[...ADMIN_ROLES]}><AdminLogs /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
