import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export function useIsGlobalAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loadingGlobalAdminCheck, setLoadingGlobalAdminCheck] = useState(true);

  useEffect(() => {
    const checkGlobalAdminStatus = async () => {
      if (sessionLoading) {
        console.log('useIsGlobalAdmin: Session still loading, returning.');
        return; // Wait for session to load
      }

      if (!session?.user) {
        console.log('useIsGlobalAdmin: No session user, not a global admin.');
        setIsGlobalAdmin(false);
        setLoadingGlobalAdminCheck(false);
        return;
      }

      setLoadingGlobalAdminCheck(true);
      try {
        console.log(`useIsGlobalAdmin: Checking type_user for user ID: ${session.user.id}`);
        const { data, error } = await supabase
          .from('type_user')
          .select('cod')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
          throw error;
        }

        const userIsGlobalAdmin = data?.cod === 'GLOBAL_ADMIN';
        setIsGlobalAdmin(userIsGlobalAdmin);
        console.log(`useIsGlobalAdmin: User ${session.user.id} (email: ${session.user.email}) is GLOBAL_ADMIN: ${userIsGlobalAdmin}, fetched cod: ${data?.cod}`);

      } catch (error: any) {
        console.error('Error checking global admin status:', error);
        showError('Erro ao verificar status de administrador global: ' + error.message);
        setIsGlobalAdmin(false);
      } finally {
        setLoadingGlobalAdminCheck(false);
        console.log('useIsGlobalAdmin: Finished checking global admin status.');
      }
    };

    checkGlobalAdminStatus();
  }, [session, sessionLoading]);

  return { isGlobalAdmin, loadingGlobalAdminCheck };
}