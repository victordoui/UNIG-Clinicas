import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";

import {
  BookOpen,
  CalendarDays,
  FileText,
  DollarSign,
  FileBadge,
  Megaphone,
  Users,
  School,
  Layers3,
  MapPinned,
  Map,
  Building2,
  Settings,
  ShieldCheck,
  BarChart3,
  Bell,
  ClipboardList,
  ScrollText,
  GraduationCap,
  Package,
  MessageSquare,
  Home as HomeIcon,
} from "lucide-react";
const Auth = lazy(() => import("./pages/Auth"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));
const AlunoPerfil = lazy(() => import("./pages/aluno/Perfil"));
const AlunoDisciplinas = lazy(() => import("./pages/aluno/Disciplinas"));
const AlunoGrade = lazy(() => import("./pages/aluno/Grade"));
const AlunoNotas = lazy(() => import("./pages/aluno/Notas"));
const AlunoDocumentos = lazy(() => import("./pages/aluno/Documentos"));
const Placeholder = lazy(() => import("./pages/Placeholder"));
const MeusRequerimentos = lazy(
  () => import("./pages/requerimentos/MeusRequerimentos"),
);
const NovoRequerimento = lazy(
  () => import("./pages/requerimentos/NovoRequerimento"),
);
const RequerimentoDetalhe = lazy(
  () => import("./pages/requerimentos/RequerimentoDetalhe"),
);
const FilaRequerimentos = lazy(
  () => import("./pages/atendimento/FilaRequerimentos"),
);
const HistoricoAluno = lazy(() => import("./pages/atendimento/HistoricoAluno"));
const AcademicoAlunos = lazy(() => import("./pages/academico/Alunos"));
const AcademicoProfessores = lazy(
  () => import("./pages/academico/Professores"),
);
const AcademicoCursos = lazy(() => import("./pages/academico/Cursos"));
const AcademicoDisciplinas = lazy(
  () => import("./pages/academico/Disciplinas"),
);
const AcademicoTurmas = lazy(() => import("./pages/academico/Turmas"));
const AcademicoMatriz = lazy(() => import("./pages/academico/Matriz"));
const AcademicoAulas = lazy(() => import("./pages/academico/Aulas"));
const AcademicoVisaoGeral = lazy(() => import("./pages/academico/VisaoGeral"));
const AcademicoCalendario = lazy(() => import("./pages/academico/Calendario"));
const AcademicoEnsalamento = lazy(
  () => import("./pages/academico/Ensalamento"),
);
const AcademicoPendencias = lazy(() => import("./pages/academico/Pendencias"));
const AcademicoAnaliseEnsalamento = lazy(
  () => import("./pages/academico/AnaliseEnsalamento"),
);
const AcademicoPublicacao = lazy(() => import("./pages/academico/Publicacao"));
const AcademicoHistorico = lazy(() => import("./pages/academico/Historico"));
const AcademicoSalasLivres = lazy(
  () => import("./pages/academico/SalasLivres"),
);
const ProfessorTurmas = lazy(() => import("./pages/professor/MinhasTurmas"));
const ProfessorLancarNotas = lazy(
  () => import("./pages/professor/LancarNotas"),
);
const ProfessorFrequencia = lazy(
  () => import("./pages/professor/RegistrarFrequencia"),
);
const ProfessorGrade = lazy(() => import("./pages/professor/GradeSemanal"));
const EspacosDashboard = lazy(() => import("./pages/espacos/Dashboard"));
const EspacosSalas = lazy(() => import("./pages/espacos/Salas"));
const EspacosMapa = lazy(() => import("./pages/espacos/Mapa"));
const EspacosAgenda = lazy(() => import("./pages/espacos/Agenda"));
const EspacosSolicitacoes = lazy(() => import("./pages/espacos/Solicitacoes"));
const EspacosReservas = lazy(() => import("./pages/espacos/Reservas"));
const EspacosSolicitar = lazy(() => import("./pages/espacos/Solicitar"));
const RelatoriosOcupacao = lazy(() => import("./pages/relatorios/Ocupacao"));
const RelatoriosAcademicos = lazy(
  () => import("./pages/relatorios/Academicos"),
);
const RelatoriosOperacionais = lazy(
  () => import("./pages/relatorios/Operacionais"),
);
const FinanceiroDashboard = lazy(() => import("./pages/financeiro/Dashboard"));
const FinanceiroMensalidades = lazy(
  () => import("./pages/financeiro/Mensalidades"),
);
const FinanceiroBoletos = lazy(() => import("./pages/financeiro/Boletos"));
const FinanceiroBolsas = lazy(() => import("./pages/financeiro/Bolsas"));
const FinanceiroRelatorios = lazy(
  () => import("./pages/financeiro/Relatorios"),
);
const AlunoFinanceiro = lazy(() => import("./pages/aluno/Financeiro"));
const ComunicadosFeed = lazy(() => import("./pages/Comunicados"));
const ComunicacaoGestao = lazy(() => import("./pages/comunicacao/Comunicados"));
const ComunicacaoNotificacoes = lazy(
  () => import("./pages/comunicacao/Notificacoes"),
);
const ComunicacaoMensagens = lazy(
  () => import("./pages/comunicacao/Mensagens"),
);
const AdminUsuarios = lazy(() => import("./pages/admin/Usuarios"));
const AdminPermissoes = lazy(() => import("./pages/admin/Permissoes"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/Configuracoes"));
const AdminLogs = lazy(() => import("./pages/admin/Logs"));
const AdminClinicas = lazy(() => import("./pages/admin/Clinicas"));
const Pacientes = lazy(() => import("./pages/patients/Pacientes"));
const AgendaFila = lazy(() => import("./pages/care/AgendaFila"));
const RecepcaoOperacional = lazy(
  () => import("./pages/care/RecepcaoOperacional"),
);
const Atendimentos = lazy(() => import("./pages/care/Atendimentos"));
const Indicadores = lazy(() => import("./pages/reporting/Indicadores"));
const DocumentosConsentimentos = lazy(
  () => import("./pages/care/DocumentosConsentimentos"),
);
const Supervisoes = lazy(() => import("./pages/care/Supervisoes"));
const Veterinaria = lazy(() => import("./pages/care/Veterinaria"));
const Especialidades = lazy(() => import("./pages/care/Especialidades"));
const ProcedimentosExames = lazy(
  () => import("./pages/care/ProcedimentosExames"),
);
const Estoque = lazy(() => import("./pages/care/Estoque"));
const PainelTV = lazy(() => import("./pages/care/PainelTV"));
const FilaQR = lazy(() => import("./pages/care/FilaQR"));
const PortalPaciente = lazy(() => import("./pages/portal/PortalPaciente"));
const PortalTutor = lazy(() => import("./pages/portal/PortalTutor"));

const ADMIN_ROLES = ["super_admin", "administrador"] as const;

const queryClient = new QueryClient();

const P = (title: string, description: string, icon: any) => (
  <ProtectedRoute>
    <Placeholder title={title} description={description} icon={icon} />
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="uniga-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <UpdateBanner />

          <Suspense
            fallback={
              <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
                Carregando módulo…
              </div>
            }
          >
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route path="/fila/qr/:token" element={<FilaQR />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pacientes"
                element={
                  <ProtectedRoute>
                    <Pacientes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/agenda-fila"
                element={
                  <ProtectedRoute>
                    <AgendaFila />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recepcao-operacional"
                element={
                  <ProtectedRoute>
                    <RecepcaoOperacional />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/painel-tv"
                element={
                  <ProtectedRoute>
                    <PainelTV />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/paciente"
                element={
                  <ProtectedRoute allowRoles={["paciente"]}>
                    <PortalPaciente />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/tutor"
                element={
                  <ProtectedRoute allowRoles={["tutor"]}>
                    <PortalTutor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/atendimentos"
                element={
                  <ProtectedRoute>
                    <Atendimentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/indicadores-clinicos"
                element={
                  <ProtectedRoute>
                    <Indicadores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documentos-consentimentos"
                element={
                  <ProtectedRoute>
                    <DocumentosConsentimentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisoes"
                element={
                  <ProtectedRoute>
                    <Supervisoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/veterinaria"
                element={
                  <ProtectedRoute>
                    <Veterinaria />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/especialidades"
                element={
                  <ProtectedRoute>
                    <Especialidades />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procedimentos-exames"
                element={
                  <ProtectedRoute>
                    <ProcedimentosExames />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estoque"
                element={
                  <ProtectedRoute>
                    <Estoque />
                  </ProtectedRoute>
                }
              />

              {/* Portal do Aluno */}
              <Route
                path="/aluno/disciplinas"
                element={
                  <ProtectedRoute>
                    <AlunoDisciplinas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/aluno/grade"
                element={
                  <ProtectedRoute>
                    <AlunoGrade />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/aluno/notas"
                element={
                  <ProtectedRoute>
                    <AlunoNotas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/aluno/financeiro"
                element={
                  <ProtectedRoute>
                    <AlunoFinanceiro />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/aluno/documentos"
                element={
                  <ProtectedRoute>
                    <AlunoDocumentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/aluno/perfil"
                element={
                  <ProtectedRoute>
                    <AlunoPerfil />
                  </ProtectedRoute>
                }
              />

              {/* Portal do Professor */}
              <Route
                path="/professor/turmas"
                element={
                  <ProtectedRoute>
                    <ProfessorTurmas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professor/turmas/:classId/notas"
                element={
                  <ProtectedRoute>
                    <ProfessorLancarNotas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professor/turmas/:classId/frequencia"
                element={
                  <ProtectedRoute>
                    <ProfessorFrequencia />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/professor/grade"
                element={
                  <ProtectedRoute>
                    <ProfessorGrade />
                  </ProtectedRoute>
                }
              />

              {/* Requerimentos */}
              <Route
                path="/requerimentos"
                element={
                  <ProtectedRoute>
                    <MeusRequerimentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requerimentos/novo"
                element={
                  <ProtectedRoute>
                    <NovoRequerimento />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requerimentos/:id"
                element={
                  <ProtectedRoute>
                    <RequerimentoDetalhe />
                  </ProtectedRoute>
                }
              />

              {/* Atendimento */}
              <Route
                path="/atendimento/requerimentos"
                element={
                  <ProtectedRoute>
                    <FilaRequerimentos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/atendimento/historico"
                element={
                  <ProtectedRoute>
                    <HistoricoAluno />
                  </ProtectedRoute>
                }
              />

              {/* Acadêmico */}
              <Route
                path="/academico"
                element={
                  <ProtectedRoute>
                    <AcademicoVisaoGeral />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/calendario"
                element={
                  <ProtectedRoute>
                    <AcademicoCalendario />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/alunos"
                element={
                  <ProtectedRoute>
                    <AcademicoAlunos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/professores"
                element={
                  <ProtectedRoute>
                    <AcademicoProfessores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/cursos"
                element={
                  <ProtectedRoute>
                    <AcademicoCursos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/disciplinas"
                element={
                  <ProtectedRoute>
                    <AcademicoDisciplinas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/turmas"
                element={
                  <ProtectedRoute>
                    <AcademicoTurmas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/matriz"
                element={
                  <ProtectedRoute>
                    <AcademicoMatriz />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/aulas"
                element={
                  <ProtectedRoute>
                    <AcademicoAulas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/ensalamento"
                element={
                  <ProtectedRoute>
                    <AcademicoEnsalamento />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/pendencias"
                element={
                  <ProtectedRoute>
                    <AcademicoPendencias />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/analise-ensalamento"
                element={
                  <ProtectedRoute>
                    <AcademicoAnaliseEnsalamento />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/publicacao"
                element={
                  <ProtectedRoute>
                    <AcademicoPublicacao />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/historico"
                element={
                  <ProtectedRoute>
                    <AcademicoHistorico />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/academico/salas-livres"
                element={
                  <ProtectedRoute>
                    <AcademicoSalasLivres />
                  </ProtectedRoute>
                }
              />

              {/* Espaços */}
              <Route
                path="/espacos"
                element={
                  <ProtectedRoute>
                    <EspacosDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/espacos/agenda"
                element={
                  <ProtectedRoute>
                    <EspacosAgenda />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/espacos/salas"
                element={
                  <ProtectedRoute>
                    <EspacosSalas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/espacos/mapa"
                element={
                  <ProtectedRoute>
                    <EspacosMapa />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/espacos/solicitar"
                element={
                  <ProtectedRoute>
                    <EspacosSolicitar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/espacos/solicitacoes"
                element={
                  <ProtectedRoute>
                    <EspacosSolicitacoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/espacos/reservas"
                element={
                  <ProtectedRoute>
                    <EspacosReservas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/espacos/eventos"
                element={P(
                  "Eventos",
                  "Eventos institucionais da unidade.",
                  Package,
                )}
              />

              {/* Comunicação */}
              <Route
                path="/comunicados"
                element={
                  <ProtectedRoute>
                    <ComunicadosFeed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comunicacao/comunicados"
                element={
                  <ProtectedRoute>
                    <ComunicacaoGestao />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comunicacao/notificacoes"
                element={
                  <ProtectedRoute>
                    <ComunicacaoNotificacoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comunicacao/mensagens"
                element={
                  <ProtectedRoute>
                    <ComunicacaoMensagens />
                  </ProtectedRoute>
                }
              />

              {/* Financeiro */}
              <Route
                path="/financeiro"
                element={
                  <ProtectedRoute>
                    <FinanceiroDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financeiro/mensalidades"
                element={
                  <ProtectedRoute>
                    <FinanceiroMensalidades />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financeiro/boletos"
                element={
                  <ProtectedRoute>
                    <FinanceiroBoletos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financeiro/bolsas"
                element={
                  <ProtectedRoute>
                    <FinanceiroBolsas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/financeiro/relatorios"
                element={
                  <ProtectedRoute>
                    <FinanceiroRelatorios />
                  </ProtectedRoute>
                }
              />

              {/* Relatórios */}
              <Route
                path="/relatorios/academicos"
                element={
                  <ProtectedRoute>
                    <RelatoriosAcademicos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios/operacionais"
                element={
                  <ProtectedRoute>
                    <RelatoriosOperacionais />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios/ocupacao"
                element={
                  <ProtectedRoute>
                    <RelatoriosOcupacao />
                  </ProtectedRoute>
                }
              />

              {/* Administração */}
              {/* Administração */}
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute allowRoles={[...ADMIN_ROLES]}>
                    <AdminUsuarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/permissoes"
                element={
                  <ProtectedRoute allowRoles={[...ADMIN_ROLES]}>
                    <AdminPermissoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/unidades"
                element={
                  <ProtectedRoute allowRoles={[...ADMIN_ROLES]}>
                    <AdminClinicas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/clinicas"
                element={
                  <ProtectedRoute allowRoles={[...ADMIN_ROLES]}>
                    <AdminClinicas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuracoes"
                element={
                  <ProtectedRoute allowRoles={[...ADMIN_ROLES]}>
                    <AdminConfiguracoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <ProtectedRoute allowRoles={[...ADMIN_ROLES, "financeiro"]}>
                    <AdminLogs />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
