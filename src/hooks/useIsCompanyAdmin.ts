import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

export function useIsCompanyAdmin() {
  const { session, loading: sessionLoading } = useSession();
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [loadingCompanyAdminCheck, setLoadingCompanyAdminCheck] = useState(true);

  useEffect(() => {
    const checkCompanyAdminStatus = async () => {
      if (sessionLoading) {
        console.log('useIsCompanyAdmin: Session still loading, returning.');
        return; // Wait for session to load
      }

      if (!session?.user) {
        console.log('useIsCompanyAdmin: No session user, not a company admin.');
        setIsCompanyAdmin(false);
        setLoadingCompanyAdminCheck(false);
        return;
      }

      setLoadingCompanyAdminCheck(true);
      try {
        console.log(`useIsCompanyAdmin: Checking user_companies for user ID: ${session.user.id}`);
        // Fetch user's roles from user_companies table using the get_user_context function
        const { data, error } = await supabase
          .rpc('get_user_context', { p_user_id: session.user.id });

        if (error) {
          throw error;
        }

        // Check if any of the user's roles is 'Admin' (company-level admin)
        const userIsCompanyAdmin = data.some(role => role.role_type_description === 'Admin');
        setIsCompanyAdmin(userIsCompanyAdmin);
        console.log(`useIsCompanyAdmin: User ${session.user.id} (email: ${session.user.email}) is Company Admin: ${userIsCompanyAdmin}`);

      } catch (error: any) {
        console.error('Error checking company admin status:', error);
        showError('Erro ao verificar status de administrador da empresa: ' + error.message);
        setIsCompanyAdmin(false);
      } finally {
        setLoadingCompanyAdminCheck(false);
        console.log('useIsCompanyAdmin: Finished checking company admin status.');
      }
    };

    checkCompanyAdminStatus();
  }, [session, sessionLoading]);

  return { isCompanyAdmin, loadingCompanyAdminCheck };
}