import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage';

interface SessionContextType {
  session: Session | null;
  loading: boolean;
  isClient: boolean;
  isProprietario: boolean;
  isAdmin: boolean;
  loadingRoles: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Role States managed internally
  const [isClient, setIsClient] = useState(false);
  const [isProprietario, setIsProprietario] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const navigate = useNavigate();

  const fetchUserRoles = useCallback(async (userId: string) => {
    setLoadingRoles(true);
    let clientStatus = false;
    let proprietorStatus = false;
    let adminStatus = false;

    try {
      // 1. Fetch User Type (Client/Proprietario/Admin)
      const { data: typeData, error: typeError } = await supabase
        .from('type_user')
        .select('cod')
        .eq('user_id', userId)
        .single();

      if (typeError && typeError.code !== 'PGRST116') {
        throw typeError;
      }
      
      const userType = typeData?.cod;
      clientStatus = userType === 'CLIENTE';
      
      // 2. Fetch Management Roles (Proprietario/Admin) via RPC
      if (userType === 'PROPRIETARIO' || userType === 'ADMIN') {
        const { data: contextData, error: contextError } = await supabase
          .rpc('get_user_context', { p_user_id: userId });

        if (contextError) {
          throw contextError;
        }

        proprietorStatus = contextData.some(role => role.role_type_description === 'Proprietário');
        adminStatus = contextData.some(role => role.role_type_description === 'Admin');
      }

    } catch (error: any) {
      console.error('Error fetching user roles:', error);
      // Do not show error toast here, just log and default to false
    } finally {
      setIsClient(clientStatus);
      setIsProprietario(proprietorStatus);
      setIsAdmin(adminStatus);
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('SessionContextProvider - Auth event:', event, 'Session:', currentSession);
        setSession(currentSession);
        setLoading(false);
        setLoadingRoles(true); // Reset roles loading state

        if (currentSession?.user) {
          fetchUserRoles(currentSession.user.id);
        } else {
          setIsClient(false);
          setIsProprietario(false);
          setIsAdmin(false);
          setLoadingRoles(false);
        }

        if (event === 'SIGNED_IN' && currentSession) {
          showSuccess('Login realizado com sucesso!');
          
          const targetCompanyId = getTargetCompanyId();
          
          if (targetCompanyId) {
            navigate('/agendar', { replace: true });
            return;
          }
          
          navigate('/', { replace: true }); 

        } else if (event === 'SIGNED_OUT') {
          showSuccess('Logout realizado com sucesso!');
          clearTargetCompanyId();
          navigate('/', { replace: true }); 
        } else if (event === 'PASSWORD_RECOVERY') {
          showSuccess('Verifique seu e-mail para redefinir a senha.');
        } else if (event === 'USER_UPDATED') {
          showSuccess('Seu perfil foi atualizado!');
          if (currentSession?.user) {
             fetchUserRoles(currentSession.user.id); // Re-fetch roles if user metadata changes
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('SessionContextProvider - Initial getSession:', initialSession);
      setSession(initialSession);
      setLoading(false);
      if (initialSession?.user) {
        fetchUserRoles(initialSession.user.id);
      } else {
        setLoadingRoles(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, fetchUserRoles]);

  const contextValue = {
    session,
    loading,
    isClient,
    isProprietario,
    isAdmin,
    loadingRoles,
  };

  return (
    <SessionContext.Provider value={contextValue}>
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