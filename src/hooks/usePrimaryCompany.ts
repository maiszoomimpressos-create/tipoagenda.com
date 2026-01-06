import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface UserCompanyContext {
  company_id: string;
  company_name: string;
  role_type_description: string;
  is_primary: boolean;
}

export function usePrimaryCompany() {
  const { session, loading: sessionLoading } = useSession();
  const [primaryCompanyId, setPrimaryCompanyId] = useState<string | null>(null);
  const [loadingPrimaryCompany, setLoadingPrimaryCompany] = useState(true);

  useEffect(() => {
    const fetchPrimaryCompany = async () => {
      if (sessionLoading) {
        return; // Wait for session to load
      }

      if (!session?.user) {
        setPrimaryCompanyId(null);
        setLoadingPrimaryCompany(false);
        return;
      }

      setLoadingPrimaryCompany(true);
      try {
        const { data, error } = await supabase
          .rpc('get_user_context', { p_user_id: session.user.id });

        if (error) {
          throw error;
        }

        const primaryCompany = data.find((company: UserCompanyContext) => company.is_primary);

        if (primaryCompany) {
          setPrimaryCompanyId(primaryCompany.company_id);
        } else {
          setPrimaryCompanyId(null);
        }

      } catch (error: any) {
        console.error('Error fetching primary company:', error);
        showError('Erro ao carregar empresa primária: ' + error.message);
        setPrimaryCompanyId(null);
      } finally {
        setLoadingPrimaryCompany(false);
      }
    };

    fetchPrimaryCompany();
  }, [session, sessionLoading]);

  return { primaryCompanyId, loadingPrimaryCompany };
}