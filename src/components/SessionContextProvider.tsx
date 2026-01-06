import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage'; // Import storage utils
import { checkAndClearExplicitLogout } from '@/utils/auth-state'; // Import para verificar logout explícito

interface SessionContextType {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Usamos useRef para rastrear se o usuário já estava logado, evitando toasts repetidos em revalidações.
  const isUserLoggedInRef = useRef(false);
  // Flag para rastrear se ainda estamos na fase de inicialização (restauração da sessão)
  const isInitializingRef = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Configura o listener de mudanças de autenticação ANTES de chamar getSession
    // para capturar todos os eventos, mas vamos ignorar os que ocorrem durante a inicialização
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        const isInitializing = isInitializingRef.current;
        
        console.log('SessionContextProvider - Auth event:', event, 'Session:', currentSession, 'IsInitializing:', isInitializing);
        
        // Durante a inicialização, ignora TODOS os eventos do listener
        // A sessão será definida apenas pelo resultado do getSession()
        if (isInitializing) {
          console.log('SessionContextProvider - Ignorando evento durante inicialização:', event);
          return;
        }
        
        // Após a inicialização, processa os eventos normalmente
        const wasLoggedIn = isUserLoggedInRef.current;
        
        // Atualiza a sessão apenas após a inicialização estar completa
        setSession(currentSession);

        if (currentSession) {
          isUserLoggedInRef.current = true;
        } else {
          isUserLoggedInRef.current = false;
        }

        // Processa eventos específicos
        if (event === 'SIGNED_OUT') {
          // Verifica se foi logout explícito
          const wasExplicitLogout = checkAndClearExplicitLogout();
          if (wasExplicitLogout) {
            // Logout explícito: mostra mensagem e redireciona
            showSuccess('Logout realizado com sucesso!');
            clearTargetCompanyId(); // Limpa qualquer empresa alvo pendente no logout
            navigate('/', { replace: true });
          }
          // Se não foi explícito (expiração, refresh silencioso, etc.), apenas limpa a sessão
          // sem redirecionar - os guards vão cuidar do redirecionamento se necessário
          return;
        }

        if (event === 'SIGNED_IN' && currentSession) {
          // Só mostra o toast de sucesso se for um login fresco (não uma revalidação de token)
          if (!wasLoggedIn) {
            showSuccess('Login realizado com sucesso!');
          }
          
          const targetCompanyId = getTargetCompanyId();
          
          if (targetCompanyId) {
            // Se uma empresa alvo estiver definida, redireciona para a página de agendamento do cliente.
            navigate('/agendar', { replace: true });
            return;
          }
          
          // Se não houver empresa alvo, redireciona para a raiz.
          // O IndexPage cuidará do redirecionamento baseado no papel.
          navigate('/', { replace: true }); 

        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccess('Verifique seu e-mail para redefinir a senha.');
        } else if (event === 'USER_UPDATED') {
          showSuccess('Seu perfil foi atualizado!');
        }
      }
    );

    // Restaura a sessão do localStorage após configurar o listener
    // Esta é a fonte da verdade durante a inicialização
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      
      console.log('SessionContextProvider - Initial getSession:', initialSession);
      
      // Define a sessão inicial (fonte da verdade)
      setSession(initialSession);
      
      if (initialSession) {
        isUserLoggedInRef.current = true;
      } else {
        isUserLoggedInRef.current = false;
      }
      
      // Marca a inicialização como completa APENAS após getSession() terminar
      // Isso garante que eventos do listener que ocorreram durante a inicialização sejam ignorados
      isInitializingRef.current = false;
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]); // Dependências corrigidas: apenas 'navigate'

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};