import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import MainApplication from "./components/MainApplication"; // Import MainApplication
import ProfilePage from "./pages/ProfilePage"; // Import ProfilePage
import LandingPage from "./pages/LandingPage"; // Import LandingPage
import CompanyRegistrationPage from "./pages/CompanyRegistrationPage"; // Import CompanyRegistrationPage

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            {/* Rotas de autenticação (sem layout) */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/reset-password" element={<AuthPage />} />

            {/* Rotas da aplicação (com layout MainApplication) */}
            <Route path="/" element={<MainApplication />}>
              <Route index element={<LandingPage />} /> {/* Landing Page como rota index */}
              <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /> {/* Rota protegida para o perfil */}
              <Route path="register-company" element={<ProtectedRoute><CompanyRegistrationPage /></ProtectedRoute>} /> {/* Nova rota protegida para cadastro de empresa */}
              {/* Adicione outras rotas da aplicação aqui, por exemplo: */}
              {/* <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} /> */}
              {/* <Route path="agendamentos" element={<ProtectedRoute><AgendamentosPage /></ProtectedRoute>} /> */}
              {/* ... e assim por diante para cada item do menu */}
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