import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PWALoadingScreen } from "@/components/pwa/PWALoadingScreen";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import Movimentacoes from "./pages/Movimentacoes";
import Scanner from "./pages/Scanner";
import Alertas from "./pages/Alertas";
import Relatorios from "./pages/Relatorios";
import RelatoriosCompras from "./pages/RelatoriosCompras";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import AdminMaster from "./pages/AdminMaster";
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import RelatoriosConsolidados from "./pages/RelatoriosConsolidados";
import Auditoria from "./pages/Auditoria";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import DemandasPainel from "./pages/demandas/DemandasPainel";
import DemandasLista from "./pages/demandas/DemandasLista";
import DemandaNova from "./pages/demandas/DemandaNova";
import DemandaDetalhe from "./pages/demandas/DemandaDetalhe";
import DemandasRelatorios from "./pages/demandas/DemandasRelatorios";
import DemandasHistoricoUnidade from "./pages/demandas/DemandasHistoricoUnidade";
import OrganizationDetails from "./pages/OrganizationDetails";
import Fornecedores from "./pages/Fornecedores";
import RankingFornecedores from "./pages/RankingFornecedores";
import Contratos from "./pages/Contratos";
import Solicitacoes from "./pages/Solicitacoes";
import SolicitacaoDetalhe from "./pages/SolicitacaoDetalhe";
import Pedidos from "./pages/Pedidos";
import PedidoDetalhe from "./pages/PedidoDetalhe";
import PainelComprador from "./pages/PainelComprador";
import ComprasKanban from "./pages/ComprasKanban";
import Cotacoes from "./pages/Cotacoes";
import Servicos from "./pages/Servicos";
import RecebimentosConferencia from "./pages/RecebimentosConferencia";
import RecebimentosDivergencias from "./pages/RecebimentosDivergencias";
import RecebimentoFiscal from "./pages/RecebimentoFiscal";
import ContasAPagar from "./pages/ContasAPagar";
import FluxoCaixa from "./pages/FluxoCaixa";
import SugestoesReposicao from "./pages/SugestoesReposicao";
import PrevisaoDemanda from "./pages/PrevisaoDemanda";
import Integracoes from "./pages/Integracoes";
import Insights from "./pages/Insights";
import RelatoriosSalvos from "./pages/RelatoriosSalvos";
import Executivo from "./pages/Executivo";
import Inventario from "./pages/Inventario";
import InventarioDetalhe from "./pages/InventarioDetalhe";
import Etiquetas from "./pages/Etiquetas";
import OperacaoMobile from "./pages/OperacaoMobile";
import Locais from "./pages/Locais";
import Lotes from "./pages/Lotes";
import Transferencias from "./pages/Transferencias";
import TransferenciaDetalhe from "./pages/TransferenciaDetalhe";
import ConfiguracaoFiscal from "./pages/ConfiguracaoFiscal";
import FiscalNotas from "./pages/FiscalNotas";
import FiscalNotaDetalhe from "./pages/FiscalNotaDetalhe";
import CompraDevolucao from "./pages/CompraDevolucao";
import Aprovacoes from "./pages/Aprovacoes";
import AprovacaoDetalhe from "./pages/AprovacaoDetalhe";
import ConfiguracaoAprovacoes from "./pages/ConfiguracaoAprovacoes";
import ConfiguracaoDelegacoes from "./pages/ConfiguracaoDelegacoes";
import { ForcePasswordChange } from "./components/auth/ForcePasswordChange";
import SolicitanteLayout from "./components/layout/SolicitanteLayout";
import CIPublicAcompanhamentos from "./pages/ci/CIPublicAcompanhamentos";
import CIPublicBaseConhecimento from "./pages/ci/CIPublicBaseConhecimento";
import CIPublicAvisos from "./pages/ci/CIPublicAvisos";
import CIPublicHome from "./pages/ci/CIPublicHome";
import CIPublicChatbot from "./pages/ci/CIPublicChatbot";
import CIPublicForm from "./pages/ci/CIPublicForm";
import CIPublicLookup from "./pages/ci/CIPublicLookup";
import CIDashboard from "./pages/ci/CIDashboard";
import CIDetail from "./pages/ci/CIDetail";
import CIKanban from "./pages/ci/CIKanban";
import CIValidacao from "./pages/ci/CIValidacao";
import CIChatbotInternal from "./pages/ci/CIChatbotInternal";
import CIFormInternal from "./pages/ci/CIFormInternal";
import CIPrintView from "./pages/ci/CIPrintView";

import CaixaEntrada from "./pages/CaixaEntrada";
import ConselhoLista from "./pages/conselho/ConselhoLista";
import ConselhoNova from "./pages/conselho/ConselhoNova";
import ConselhoDetalhe from "./pages/conselho/ConselhoDetalhe";
import ConselhoHistorico from "./pages/conselho/ConselhoHistorico";
import ConselhoDashboard from "./pages/conselho/ConselhoDashboard";
import { SupplierLayout } from "./components/layout/SupplierLayout";
import PortalDashboard from "./pages/fornecedor/PortalDashboard";
import PortalLicitacoes from "./pages/fornecedor/PortalLicitacoes";
import PortalItens from "./pages/fornecedor/PortalItens";
import PortalPedidos from "./pages/fornecedor/PortalPedidos";
import PortalPedidoDetalhe from "./pages/fornecedor/PortalPedidoDetalhe";
import PortalCaixaEntrada from "./pages/fornecedor/PortalCaixaEntrada";
import PortalMeuCadastro from "./pages/fornecedor/PortalMeuCadastro";
import PortalDocumentos from "./pages/fornecedor/PortalDocumentos";
import PortalNotasFiscais from "./pages/fornecedor/PortalNotasFiscais";
import CadastroFornecedor from "./pages/CadastroFornecedor";
import ContagemCiclica from "./pages/ContagemCiclica";
import SeparacaoOndas from "./pages/SeparacaoOndas";
import PortalSolicitante from "./pages/PortalSolicitante";
import ExportacoesContabeis from "./pages/ExportacoesContabeis";
import BIAvancado from "./pages/BIAvancado";
import AceitarConvite from "./pages/AceitarConvite";
import Convites from "./pages/admin/Convites";
import PerfisPermissoes from "./pages/admin/PerfisPermissoes";
import ConfiguracoesGerais from "./pages/admin/ConfiguracoesGerais";
import SetoresCentroCusto from "./pages/admin/SetoresCentroCusto";
import RegrasAprovacao from "./pages/admin/RegrasAprovacao";
import FiscalRegulatorio from "./pages/admin/FiscalRegulatorio";
import AuditoriaLogs from "./pages/admin/AuditoriaLogs";
import ConvitesFornecedores from "./pages/admin/ConvitesFornecedores";
import Unidades from "./pages/admin/Unidades";
import ConviteFornecedor from "./pages/ConviteFornecedor";
import { SupplierAccessGate } from "./components/fornecedor/SupplierAccessGate";
import PatrimonioLista from "./pages/patrimonio/PatrimonioLista";
import PatrimonioItens from "./pages/patrimonio/PatrimonioItens";
import PatrimonioForm from "./pages/patrimonio/PatrimonioForm";
import PatrimonioDetalhe from "./pages/patrimonio/PatrimonioDetalhe";
import PatrimonioCategorias from "./pages/patrimonio/PatrimonioCategorias";
import PatrimonioMovimentacoes from "./pages/patrimonio/PatrimonioMovimentacoes";
import PatrimonioInventario from "./pages/patrimonio/PatrimonioInventario";
import PatrimonioEtiquetas from "./pages/patrimonio/PatrimonioEtiquetas";
import PatrimonioImportacao from "./pages/patrimonio/PatrimonioImportacao";
import PatrimonioRelatorios from "./pages/patrimonio/PatrimonioRelatorios";
import PatrimonioPublico from "./pages/patrimonio/PatrimonioPublico";

const queryClient = new QueryClient();

const App = () => {
  useRealtimeNotifications();
  usePWAUpdate();
  
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="unig-ops-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <PWALoadingScreen />
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <Routes>
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

            {/* Requisição de Compra (CI) — autenticado, dedicado ao Solicitante */}
            <Route path="/unigops/ci" element={<ProtectedRoute><SolicitanteLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/unigops/ci/public" replace />} />
              <Route path="public" element={<CIPublicHome />} />
              <Route path="chatbot" element={<CIPublicChatbot />} />
              <Route path="formulario" element={<CIPublicForm />} />
              <Route path="consulta" element={<CIPublicLookup />} />
              <Route path="consulta/:protocolo" element={<CIPublicLookup />} />
              <Route path="acompanhamentos" element={<CIPublicAcompanhamentos />} />
              <Route path="base-conhecimento" element={<CIPublicBaseConhecimento />} />
              <Route path="avisos" element={<CIPublicAvisos />} />
            </Route>
            <Route path="/unigops/ci/imprimir/:protocolo" element={<ProtectedRoute><CIPrintView mode="public" /></ProtectedRoute>} />

            {/* Modo interno CI */}
            <Route path="/dashboard/ci" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/ci/minhas" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIDashboard mine /></ProtectedRoute>} />
            <Route path="/dashboard/ci/chatbot" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIChatbotInternal /></ProtectedRoute>} />
            <Route path="/dashboard/ci/formulario" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIFormInternal /></ProtectedRoute>} />
            <Route path="/dashboard/ci/kanban" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIKanban /></ProtectedRoute>} />
            <Route path="/dashboard/ci/validacao" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","solicitante","visitante","conselho"]}><CIValidacao /></ProtectedRoute>} />
            <Route path="/dashboard/ci/:id" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","conselho"]}><CIDetail /></ProtectedRoute>} />
            <Route path="/dashboard/ci/:id/imprimir" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","conselho"]}><CIPrintView mode="auth" /></ProtectedRoute>} />


            <Route path="/auth" element={<Auth />} />
            <Route path="/aceitar-convite/:token" element={<AceitarConvite />} />
            <Route path="/convite-fornecedor/:token" element={<ConviteFornecedor />} />
            <Route path="/cadastro-fornecedor" element={<CadastroFornecedor />} />
            <Route path="/cadastro-fornecedor/:token" element={<CadastroFornecedor />} />

            {/* Portal de Fornecedores */}
            <Route path="/portal-fornecedor" element={<ProtectedRoute><SupplierLayout /></ProtectedRoute>}>
              <Route index element={<PortalDashboard />} />
              <Route path="caixa" element={<PortalCaixaEntrada />} />
              <Route path="meu-cadastro" element={<PortalMeuCadastro />} />
              <Route path="documentos" element={<PortalDocumentos />} />
              <Route path="completar-cadastro" element={<CadastroFornecedor />} />
              <Route path="licitacoes" element={<SupplierAccessGate><PortalLicitacoes /></SupplierAccessGate>} />
              <Route path="itens" element={<SupplierAccessGate><PortalItens /></SupplierAccessGate>} />
              <Route path="pedidos" element={<SupplierAccessGate><PortalPedidos /></SupplierAccessGate>} />
              <Route path="pedidos/:id" element={<SupplierAccessGate><PortalPedidoDetalhe /></SupplierAccessGate>} />
              <Route path="notas-fiscais" element={<SupplierAccessGate><PortalNotasFiscais /></SupplierAccessGate>} />
            </Route>

            <Route path="/install" element={<Install />} />
            <Route path="/change-password" element={<ForcePasswordChange />} />
            <Route path="/inicio" element={<Navigate to="/dashboard" replace />} />

            {/* Central de Demandas e Projetos Operacionais */}
            <Route path="/demandas" element={<ProtectedRoute><MainLayout><DemandasPainel /></MainLayout></ProtectedRoute>} />
            <Route path="/demandas/lista" element={<ProtectedRoute><MainLayout><DemandasLista /></MainLayout></ProtectedRoute>} />
            <Route path="/demandas/nova" element={<ProtectedRoute><MainLayout><DemandaNova /></MainLayout></ProtectedRoute>} />
            <Route path="/demandas/:id" element={<ProtectedRoute><MainLayout><DemandaDetalhe /></MainLayout></ProtectedRoute>} />
            <Route path="/demandas/relatorios" element={<ProtectedRoute><MainLayout><DemandasRelatorios /></MainLayout></ProtectedRoute>} />
            <Route path="/demandas/relatorio-mensal" element={<ProtectedRoute><MainLayout><DemandasRelatorios /></MainLayout></ProtectedRoute>} />
            <Route path="/demandas/historico-unidade" element={<ProtectedRoute><MainLayout><DemandasHistoricoUnidade /></MainLayout></ProtectedRoute>} />
            <Route path="/admin/unidades" element={<ProtectedRoute><Unidades /></ProtectedRoute>} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/produtos" element={
              <ProtectedRoute>
                <Produtos />
              </ProtectedRoute>
            } />
            <Route path="/movimentacoes" element={
              <ProtectedRoute>
                <Movimentacoes />
              </ProtectedRoute>
            } />
            <Route path="/scanner" element={
              <ProtectedRoute>
                <Scanner />
              </ProtectedRoute>
            } />
            <Route path="/alertas" element={
              <ProtectedRoute>
                <Alertas />
              </ProtectedRoute>
            } />
            <Route path="/relatorios" element={
              <ProtectedRoute>
                <Relatorios />
              </ProtectedRoute>
            } />
            <Route path="/relatorios/compras" element={
              <ProtectedRoute>
                <RelatoriosCompras />
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute requiredRole="admin">
                <Usuarios />
              </ProtectedRoute>
            } />
            <Route path="/solicitacoes" element={
              <ProtectedRoute>
                <Solicitacoes />
              </ProtectedRoute>
            } />
            <Route path="/solicitacoes/minhas" element={
              <ProtectedRoute>
                <Solicitacoes mine />
              </ProtectedRoute>
            } />
            <Route path="/solicitacoes/:id" element={
              <ProtectedRoute>
                <SolicitacaoDetalhe />
              </ProtectedRoute>
            } />
            <Route path="/fornecedores" element={
              <ProtectedRoute>
                <Fornecedores />
              </ProtectedRoute>
            } />
            <Route path="/fornecedores/ranking" element={
              <ProtectedRoute>
                <RankingFornecedores />
              </ProtectedRoute>
            } />
            <Route path="/contratos" element={
              <ProtectedRoute>
                <Contratos />
              </ProtectedRoute>
            } />
            <Route path="/recebimento-fiscal" element={
              <ProtectedRoute>
                <RecebimentoFiscal />
              </ProtectedRoute>
            } />
            <Route path="/compras/painel" element={
              <ProtectedRoute><PainelComprador /></ProtectedRoute>
            } />
            <Route path="/compras/kanban" element={
              <ProtectedRoute><ComprasKanban /></ProtectedRoute>
            } />
            <Route path="/compras/cotacoes" element={
              <ProtectedRoute><Cotacoes /></ProtectedRoute>
            } />
            <Route path="/servicos" element={
              <ProtectedRoute><Servicos /></ProtectedRoute>
            } />
            <Route path="/recebimentos/conferencia" element={
              <ProtectedRoute><RecebimentosConferencia /></ProtectedRoute>
            } />
            <Route path="/recebimentos/divergencias" element={
              <ProtectedRoute><RecebimentosDivergencias /></ProtectedRoute>
            } />
            <Route path="/pedidos" element={
              <ProtectedRoute>
                <Pedidos />
              </ProtectedRoute>
            } />
            <Route path="/pedidos/:id" element={
              <ProtectedRoute>
                <PedidoDetalhe />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/contas-a-pagar" element={
              <ProtectedRoute>
                <ContasAPagar />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/fluxo-caixa" element={
              <ProtectedRoute>
                <FluxoCaixa />
              </ProtectedRoute>
            } />
            <Route path="/inteligencia/sugestoes-reposicao" element={
              <ProtectedRoute>
                <SugestoesReposicao />
              </ProtectedRoute>
            } />
            <Route path="/inteligencia/previsao-demanda" element={
              <ProtectedRoute>
                <PrevisaoDemanda />
              </ProtectedRoute>
            } />
            <Route path="/integracoes" element={
              <ProtectedRoute requiredRole="admin">
                <Integracoes />
              </ProtectedRoute>
            } />
            <Route path="/executivo" element={
              <ProtectedRoute>
                <Executivo />
              </ProtectedRoute>
            } />
            <Route path="/insights" element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            } />
            <Route path="/relatorios/salvos" element={
              <ProtectedRoute>
                <RelatoriosSalvos />
              </ProtectedRoute>
            } />
            <Route path="/op" element={
              <ProtectedRoute>
                <OperacaoMobile />
              </ProtectedRoute>
            } />
            <Route path="/inventario" element={
              <ProtectedRoute>
                <Inventario />
              </ProtectedRoute>
            } />
            <Route path="/inventario/:id" element={
              <ProtectedRoute>
                <InventarioDetalhe />
              </ProtectedRoute>
            } />
            <Route path="/etiquetas" element={
              <ProtectedRoute>
                <Etiquetas />
              </ProtectedRoute>
            } />
            <Route path="/locais" element={
              <ProtectedRoute>
                <Locais />
              </ProtectedRoute>
            } />
            <Route path="/lotes" element={
              <ProtectedRoute>
                <Lotes />
              </ProtectedRoute>
            } />
            <Route path="/transferencias" element={
              <ProtectedRoute>
                <Transferencias />
              </ProtectedRoute>
            } />
            <Route path="/transferencias/:id" element={
              <ProtectedRoute>
                <TransferenciaDetalhe />
              </ProtectedRoute>
            } />
            <Route path="/configuracoes/fiscal" element={<ProtectedRoute requiredRole="admin"><ConfiguracaoFiscal /></ProtectedRoute>} />
            <Route path="/fiscal/notas" element={<ProtectedRoute><FiscalNotas /></ProtectedRoute>} />
            <Route path="/fiscal/notas/:id" element={<ProtectedRoute><FiscalNotaDetalhe /></ProtectedRoute>} />
            <Route path="/pedidos/:id/devolucao" element={<ProtectedRoute><CompraDevolucao /></ProtectedRoute>} />
            <Route path="/caixa-de-entrada" element={<ProtectedRoute blockUnigRoles={["engenheira","validador_regulatorio","conselho"]}><CaixaEntrada /></ProtectedRoute>} />
            <Route path="/aprovacoes" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><Aprovacoes /></ProtectedRoute>} />
            <Route path="/aprovacoes/:id" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><AprovacaoDetalhe /></ProtectedRoute>} />
            <Route path="/configuracoes/aprovacoes" element={<ProtectedRoute requiredRole="admin"><ConfiguracaoAprovacoes /></ProtectedRoute>} />
            <Route path="/configuracoes/delegacoes" element={<ProtectedRoute><ConfiguracaoDelegacoes /></ProtectedRoute>} />
            <Route path="/conselho" element={<ProtectedRoute requireCouncilMember><ConselhoLista /></ProtectedRoute>} />
            <Route path="/conselho/historico" element={<ProtectedRoute requireCouncilMember><ConselhoHistorico /></ProtectedRoute>} />
            <Route path="/conselho/dashboard" element={<ProtectedRoute requireCouncilMember><ConselhoDashboard /></ProtectedRoute>} />
            <Route path="/conselho/nova" element={<ProtectedRoute requireCouncilMember><ConselhoNova /></ProtectedRoute>} />
            <Route path="/conselho/:id" element={<ProtectedRoute requireCouncilMember><ConselhoDetalhe /></ProtectedRoute>} />


          <Route path="/super-admin-dashboard" element={
            <ProtectedRoute requireSuperAdmin={true}>
              <DashboardSuperAdmin />
            </ProtectedRoute>
          } />
          <Route path="/auditoria" element={
            <ProtectedRoute requiredRole="admin">
              <Auditoria />
            </ProtectedRoute>
          } />
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <Configuracoes />
              </ProtectedRoute>
            } />
            <Route path="/admin-master" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <AdminMaster />
              </ProtectedRoute>
            } />
            <Route path="/admin-master/organization/:id" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <OrganizationDetails />
              </ProtectedRoute>
            } />
            <Route path="/relatorios-consolidados" element={
              <ProtectedRoute requireSuperAdmin={true}>
                <RelatoriosConsolidados />
              </ProtectedRoute>
            } />
            <Route path="/contagem-ciclica" element={<ProtectedRoute><ContagemCiclica /></ProtectedRoute>} />
            <Route path="/separacao-ondas" element={<ProtectedRoute><SeparacaoOndas /></ProtectedRoute>} />
            <Route path="/portal-solicitante" element={<ProtectedRoute><PortalSolicitante /></ProtectedRoute>} />
            <Route path="/exportacoes-contabeis" element={<ProtectedRoute><ExportacoesContabeis /></ProtectedRoute>} />
            <Route path="/bi-avancado" element={<ProtectedRoute><BIAvancado /></ProtectedRoute>} />

            {/* === Rotas-alias da nova sidebar (apontam para componentes existentes) === */}
            {/* Solicitação de Compra */}
            <Route path="/solicitacao/nova" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIFormInternal /></ProtectedRoute>} />
            <Route path="/solicitacao/minhas" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIDashboard mine /></ProtectedRoute>} />
            {/* Gestão de Requisições */}
            <Route path="/gestao-requisicoes/todas" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIDashboard /></ProtectedRoute>} />
            <Route path="/gestao-requisicoes/pendencias" element={<Navigate to="/conselho/pendencias" replace />} />
            <Route path="/conselho/pendencias" element={<ProtectedRoute><CaixaEntrada title="Pendências do Conselho" /></ProtectedRoute>} />
            <Route path="/gestao-requisicoes/validacoes" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","solicitante","visitante","conselho"]}><CIValidacao /></ProtectedRoute>} />
            <Route path="/gestao-requisicoes/aprovacoes" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><Aprovacoes /></ProtectedRoute>} />
            <Route path="/gestao-requisicoes/kanban" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIKanban /></ProtectedRoute>} />
            <Route path="/gestao-requisicoes/painel" element={<ProtectedRoute blockUnigRoles={["compras","almoxarifado","engenheira","validador_regulatorio","conselho"]}><CIDashboard /></ProtectedRoute>} />
            {/* Administração */}
            <Route path="/admin/usuarios" element={<ProtectedRoute requiredRole="admin"><Usuarios /></ProtectedRoute>} />
            <Route path="/admin/convites" element={<ProtectedRoute requiredRole="admin"><Convites /></ProtectedRoute>} />
            <Route path="/admin/convites-fornecedores" element={<ProtectedRoute requiredRole="admin"><ConvitesFornecedores /></ProtectedRoute>} />
            <Route path="/admin/perfis-permissoes" element={<ProtectedRoute requiredRole="admin"><PerfisPermissoes /></ProtectedRoute>} />
            <Route path="/admin/configuracoes-gerais" element={<ProtectedRoute requiredRole="admin"><ConfiguracoesGerais /></ProtectedRoute>} />
            <Route path="/admin/setores-centro-custo" element={<ProtectedRoute requiredRole="admin"><SetoresCentroCusto /></ProtectedRoute>} />
            <Route path="/admin/regras-aprovacao" element={<ProtectedRoute requiredRole="admin"><RegrasAprovacao /></ProtectedRoute>} />
            <Route path="/admin/fiscal-regulatorio" element={<ProtectedRoute requiredRole="admin"><FiscalRegulatorio /></ProtectedRoute>} />
            <Route path="/admin/integracoes" element={<ProtectedRoute requiredRole="admin"><Integracoes /></ProtectedRoute>} />
            <Route path="/admin/auditoria-logs" element={<ProtectedRoute requiredRole="admin"><AuditoriaLogs /></ProtectedRoute>} />

            {/* Patrimônio */}
            <Route path="/patrimonio" element={<ProtectedRoute><PatrimonioLista /></ProtectedRoute>} />
            <Route path="/patrimonio/itens" element={<ProtectedRoute><PatrimonioItens /></ProtectedRoute>} />
            <Route path="/patrimonio/novo" element={<ProtectedRoute><PatrimonioForm /></ProtectedRoute>} />

            <Route path="/patrimonio/categorias" element={<ProtectedRoute><PatrimonioCategorias /></ProtectedRoute>} />
            <Route path="/patrimonio/inventario" element={<ProtectedRoute><PatrimonioInventario /></ProtectedRoute>} />
            <Route path="/patrimonio/movimentacoes" element={<ProtectedRoute><PatrimonioMovimentacoes /></ProtectedRoute>} />
            <Route path="/patrimonio/etiquetas" element={<ProtectedRoute><PatrimonioEtiquetas /></ProtectedRoute>} />
            <Route path="/patrimonio/importacao" element={<ProtectedRoute><PatrimonioImportacao /></ProtectedRoute>} />
            <Route path="/patrimonio/relatorios" element={<ProtectedRoute><PatrimonioRelatorios /></ProtectedRoute>} />
            <Route path="/patrimonio/:id" element={<ProtectedRoute><PatrimonioDetalhe /></ProtectedRoute>} />
            <Route path="/patrimonio/:id/editar" element={<ProtectedRoute><PatrimonioForm /></ProtectedRoute>} />
            <Route path="/p/:qr" element={<PatrimonioPublico />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
