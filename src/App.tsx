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
import SettingsPage from "./pages/SettingsPage";
import ContractRegistrationPage from "./pages/ContractRegistrationPage"; // Import the new ContractRegistrationPage
import { useIsAdmin } from "./hooks/useIsAdmin";

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

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, loadingAdminCheck } = useIsAdmin();
  const { loading: sessionLoading } = useSession();

  if (sessionLoading || loadingAdminCheck) {
    return <div className="min-h-screen flex items-center justify-center">Verificando permissões...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
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

            {/* Rotas da aplicação (com layout MainApplication) */}
            <Route path="/" element={<MainApplication />}>
              <Route index element={<LandingPage />} />
              <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="register-company" element={<ProtectedRoute><CompanyRegistrationPage /></ProtectedRoute>} />
              
              {/* Rotas do Dashboard (protegidas) */}
              <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="agendamentos" element={<ProtectedRoute><AgendamentosPage /></ProtectedRoute>} />
              <Route path="clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
              <Route path="colaboradores" element={<ProtectedRoute><ColaboradoresPage /></ProtectedRoute>} />
              <Route path="financeiro" element={<ProtectedRoute><FinanceiroPage /></ProtectedRoute>} />
              <Route path="estoque" element={<ProtectedRoute><EstoquePage /></ProtectedRoute>} />
              <Route path="relatorios" element={<ProtectedRoute><RelatoriosPage /></ProtectedRoute>} />
              <Route path="fidelidade" element={<ProtectedRoute><FidelidadePage /></ProtectedRoute>} />

              {/* Rotas de formulários específicos (protegidos) */}
              <Route path="novo-agendamento" element={<ProtectedRoute><NovoAgendamentoPage /></ProtectedRoute>} />
              <Route path="novo-cliente" element={<ProtectedRoute><NovoClientePage /></ProtectedRoute>} />
              <Route path="fechar-caixa" element={<ProtectedRoute><FecharCaixaPage /></ProtectedRoute>} />

              {/* Rotas de Administrador (protegidas por AdminProtectedRoute) */}
              <Route path="settings" element={<AdminProtectedRoute><SettingsPage /></AdminProtectedRoute>} />
              <Route path="settings/new-contract" element={<AdminProtectedRoute><ContractRegistrationPage /></AdminProtectedRoute>} /> {/* New route */}
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