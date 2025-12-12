import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import MainApplication from "./components/MainApplication";
import ProfilePage from "./pages/ProfilePage";
import LandingPage from "./pages/LandingPage";
import CompanyRegistrationPage from "./pages/CompanyRegistrationPage";
import DashboardPage from "./pages/DashboardPage";
import AgendamentosPage from "./pages/AgendamentosPage";
import ClientesPage from "./pages/ClientesPage";
import ColaboradoresPage from "./pages/ColaboradoresPage";
import FinanceiroPage from "./pages/FinanceiroPage";
import EstoquePage from "./pages/EstoquePage";
import RelatoriosPage from "./pages/RelatoriosPage";
import FidelidadePage from "./pages/FidelidadePage";
import NovoAgendamentoPage from "./pages/NovoAgendamentoPage";
import NovoClientePage from "./pages/NovoClientePage";
import FecharCaixaPage from "./pages/FecharCaixaPage";
// import SettingsPage from "./pages/SettingsPage"; // Removed
import ContractRegistrationPage from "./pages/ContractRegistrationPage";
import SegmentManagementPage from "./pages/SegmentManagementPage";
import ServicesPage from "./pages/ServicesPage";
import ServiceFormPage from "./pages/ServiceFormPage";
import EditClientPage from "./pages/EditClientPage";
import CollaboratorFormPage from "./pages/CollaboratorFormPage";
import CollaboratorSchedulePage from "./pages/CollaboratorSchedulePage";
import EditAgendamentoPage from "./pages/EditAgendamentoPage";
import ClientAppointmentPage from "./pages/ClientAppointmentPage";
import ClientAppointmentsPage from "./pages/ClientAppointmentsPage";
import ProductFormPage from "./pages/ProductFormPage";
import IndexPage from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import PlanManagementPage from "./pages/PlanManagementPage"; // Import new page
import ContractManagementPage from "./pages/ContractManagementPage"; // Import new page
import { useIsCompanyAdmin } from "./hooks/useIsCompanyAdmin";
import { useIsGlobalAdmin } from "./hooks/useIsGlobalAdmin";
import { useIsClient } from "./hooks/useIsClient";
import ContractList from "./components/ContractList";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useSession();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const GlobalAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin();
  const { loading: sessionLoading } = useSession();

  if (sessionLoading || loadingGlobalAdminCheck) {
    return <div className="min-h-screen flex items-center justify-center">Verificando permissões de administrador global...</div>;
  }

  if (!isGlobalAdmin) {
    return <Navigate to="/" replace />; // Redirect to root if not global admin
  }

  return <>{children}</>;
};

const CompanyAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin();
  const { loading: sessionLoading } = useSession();

  if (sessionLoading || loadingCompanyAdminCheck) {
    return <div className="min-h-screen flex items-center justify-center">Verificando permissões de administrador da empresa...</div>;
  }

  if (!isCompanyAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const ClientProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isClient, loadingClientCheck } = useIsClient();
  const { loading: sessionLoading } = useSession();

  if (sessionLoading || loadingClientCheck) {
    return <div className="min-h-screen flex items-center justify-center">Verificando permissões de cliente...</div>;
  }

  if (!isClient) {
    // If not a client, redirect to a more appropriate page or login
    return <Navigate to="/" replace />; // Or /login, or /dashboard if they are another role
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            {/* Rotas de autenticação (sem layout MainApplication) */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/reset-password" element={<AuthPage />} />

            {/* Rota do Admin Global (sem layout MainApplication) */}
            <Route path="/admin-dashboard" element={<GlobalAdminProtectedRoute><AdminDashboard /></GlobalAdminProtectedRoute>} />
            {/* Rotas de gerenciamento de contratos e segmentos, agora aninhadas sob /admin-dashboard */}
            <Route path="/admin-dashboard/contracts" element={<GlobalAdminProtectedRoute><ContractManagementPage /></GlobalAdminProtectedRoute>} />
            <Route path="/admin-dashboard/new-contract" element={<GlobalAdminProtectedRoute><ContractRegistrationPage /></GlobalAdminProtectedRoute>} />
            <Route path="/admin-dashboard/edit-contract/:contractId" element={<GlobalAdminProtectedRoute><ContractRegistrationPage /></GlobalAdminProtectedRoute>} />
            <Route path="/admin-dashboard/segments" element={<GlobalAdminProtectedRoute><SegmentManagementPage /></GlobalAdminProtectedRoute>} />
            {/* Rotas de gerenciamento de planos */}
            <Route path="/admin-dashboard/plans" element={<GlobalAdminProtectedRoute><PlanManagementPage /></GlobalAdminProtectedRoute>} />


            {/* Rotas da aplicação (com layout MainApplication) */}
            <Route path="/" element={<MainApplication />}>
              <Route index element={<IndexPage />} />
              <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="register-company" element={<ProtectedRoute><CompanyRegistrationPage /></ProtectedRoute>} />
              
              {/* Rotas de Cliente (protegidas por ClientProtectedRoute) */}
              <Route path="agendar" element={<ClientProtectedRoute><ClientAppointmentPage /></ClientProtectedRoute>} />
              <Route path="meus-agendamentos" element={<ClientProtectedRoute><ClientAppointmentsPage /></ClientProtectedRoute>} />

              {/* Rotas do Dashboard (protegidas) */}
              <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="agendamentos" element={<ProtectedRoute><AgendamentosPage /></ProtectedRoute>} />
              <Route path="agendamentos/edit/:appointmentId" element={<ProtectedRoute><EditAgendamentoPage /></ProtectedRoute>} />
              <Route path="servicos" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
              <Route path="servicos/new" element={<ProtectedRoute><ServiceFormPage /></ProtectedRoute>} />
              <Route path="servicos/edit/:serviceId" element={<ProtectedRoute><ServiceFormPage /></ProtectedRoute>} />
              <Route path="clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
              <Route path="clientes/edit/:clientId" element={<ProtectedRoute><EditClientPage /></ProtectedRoute>} />
              <Route path="colaboradores" element={<ProtectedRoute><ColaboradoresPage /></ProtectedRoute>} />
              <Route path="colaboradores/new" element={<ProtectedRoute><CollaboratorFormPage /></ProtectedRoute>} />
              <Route path="colaboradores/edit/:collaboratorId" element={<ProtectedRoute><CollaboratorFormPage /></ProtectedRoute>} />
              <Route path="colaboradores/:collaboratorId/schedule" element={<ProtectedRoute><CollaboratorSchedulePage /></ProtectedRoute>} />
              <Route path="financeiro" element={<ProtectedRoute><FinanceiroPage /></ProtectedRoute>} />
              <Route path="estoque" element={<ProtectedRoute><EstoquePage /></ProtectedRoute>} />
              <Route path="estoque/new" element={<ProtectedRoute><ProductFormPage /></ProtectedRoute>} />
              <Route path="estoque/edit/:productId" element={<ProtectedRoute><ProductFormPage /></ProtectedRoute>} />
              <Route path="relatorios" element={<ProtectedRoute><RelatoriosPage /></ProtectedRoute>} />
              <Route path="fidelidade" element={<ProtectedRoute><FidelidadePage /></ProtectedRoute>} />

              {/* Rotas de formulários específicos (protegidas) */}
              <Route path="novo-agendamento" element={<ProtectedRoute><NovoAgendamentoPage /></ProtectedRoute>} />
              <Route path="novo-cliente" element={<ProtectedRoute><NovoClientePage /></ProtectedRoute>} />
              <Route path="fechar-caixa" element={<ProtectedRoute><FecharCaixaPage /></ProtectedRoute>} />

              {/* A rota /settings não existe mais, suas funcionalidades foram movidas */}
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;