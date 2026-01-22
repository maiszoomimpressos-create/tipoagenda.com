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
  const [primaryCompanyName, setPrimaryCompanyName] = useState<string | null>(null);
  const [loadingPrimaryCompany, setLoadingPrimaryCompany] = useState(true);
  // Usa apenas o user.id como dependência para evitar re-execuções desnecessárias
  const userId = session?.user?.id || null;

  useEffect(() => {
    const fetchPrimaryCompany = async () => {
      if (sessionLoading) {
        return; // Wait for session to load
      }

      if (!session?.user) {
        setPrimaryCompanyId(null);
        setPrimaryCompanyName(null);
        setLoadingPrimaryCompany(false);
        return;
      }

      setLoadingPrimaryCompany(true);
      try {
        console.log('usePrimaryCompany: Buscando contexto do usuário para user_id:', session.user.id);
        const { data, error } = await supabase
          .rpc('get_user_context', { p_user_id: session.user.id });

        if (error) {
          console.error('usePrimaryCompany: Erro ao buscar contexto do usuário:', error);
          throw error;
        }

        console.log('usePrimaryCompany: Dados retornados do get_user_context:', data);
        const primaryCompany = data.find((company: UserCompanyContext) => company.is_primary);

        if (primaryCompany) {
          console.log('usePrimaryCompany: Empresa primária encontrada:', primaryCompany.company_id, primaryCompany.company_name);
          setPrimaryCompanyId(primaryCompany.company_id);

          // Fetch company name using the primaryCompanyId
          const { data: companyNameData, error: companyNameError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', primaryCompany.company_id)
            .single();

          if (companyNameError) {
            throw companyNameError;
          }
          setPrimaryCompanyName(companyNameData.name);
          console.log('usePrimaryCompany: Nome da empresa carregado:', companyNameData.name);
        } else {
          console.warn('usePrimaryCompany: Nenhuma empresa primária encontrada para o usuário');
          setPrimaryCompanyId(null);
          setPrimaryCompanyName(null);
        }

      } catch (error: any) {
        console.error('Error fetching primary company:', error);
        showError('Erro ao carregar empresa primária: ' + error.message);
        setPrimaryCompanyId(null);
        setPrimaryCompanyName(null);
      } finally {
        setLoadingPrimaryCompany(false);
      }
    };

    fetchPrimaryCompany();
  }, [userId, sessionLoading]); // Usa userId em vez de session inteiro

  return { primaryCompanyId, primaryCompanyName, loadingPrimaryCompany };
}