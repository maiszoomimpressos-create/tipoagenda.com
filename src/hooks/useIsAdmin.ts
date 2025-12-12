import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export function useIsAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdminCheck, setLoadingAdminCheck] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (sessionLoading) {
        return; // Wait for session to load
      }

      if (!session?.user) {
        setIsAdmin(false);
        setLoadingAdminCheck(false);
        return;
      }

      setLoadingAdminCheck(true);
      try {
        // Fetch user's roles from user_companies table using the get_user_context function
        const { data, error } = await supabase
          .rpc('get_user_context', { p_user_id: session.user.id });

        if (error) {
          throw error;
        }

        // Check if any of the user's roles is 'Admin'
        const userIsAdmin = data.some(role => role.role_type_description === 'Admin');
        setIsAdmin(userIsAdmin);

      } catch (error: any) {
        console.error('Error checking admin status:', error);
        showError('Erro ao verificar status de administrador: ' + error.message);
        setIsAdmin(false);
      } finally {
        setLoadingAdminCheck(false);
      }
    };

    checkAdminStatus();
  }, [session, sessionLoading]);

  return { isAdmin, loadingAdminCheck };
}