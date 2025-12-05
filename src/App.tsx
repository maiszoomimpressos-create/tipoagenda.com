import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import MainApplication from "./components/MainApplication"; // Import MainApplication

const queryClient = new QueryClient();

// Adicionando logs de depuração para variáveis de ambiente
console.log('App.tsx - Conteúdo de import.meta.env:', import.meta.env);
console.log('App.tsx - VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('App.tsx - VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);


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
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/reset-password" element={<AuthPage />} />
            {/* A Landing Page (parte do MainApplication) será a página de entrada sem proteção */}
            <Route path="/" element={<MainApplication />} />
            {/* Exemplo de rota protegida, caso você queira adicionar mais tarde */}
            {/* <Route path="/dashboard-protected" element={<ProtectedRoute><SomeProtectedComponent /></ProtectedRoute>} /> */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;