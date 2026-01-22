import { useState, useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { usePrimaryCompany } from './usePrimaryCompany';

interface FeatureAccessResult {
  hasAccess: boolean;
  loading: boolean;
  limit: number | null; // Retorna o limite da funcionalidade, se houver
}

export function useHasFeature(featureSlug: string): FeatureAccessResult {
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();

  const [hasAccess, setHasAccess] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id || null; // Usar userId para dependência do useEffect

  useEffect(() => {
    const checkFeatureAccess = async () => {
      if (sessionLoading || loadingPrimaryCompany) {
        // Ainda carregando informações essenciais
        setLoading(true);
        return;
      }

      if (!userId || !primaryCompanyId) {
        // Se não há usuário logado ou empresa primária, não há acesso
        setHasAccess(false);
        setLimit(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Obter o ID da funcionalidade pelo slug
        const { data: featureData, error: featureError } = await supabase
          .from('features')
          .select('id')
          .eq('slug', featureSlug)
          .single();

        if (featureError || !featureData) {
          console.warn(`useHasFeature: Funcionalidade com slug '${featureSlug}' não encontrada.`);
          setHasAccess(false);
          setLimit(null);
          setLoading(false);
          return;
        }

        const featureId = featureData.id;

        // 2. Obter o plano da empresa primária
        // Usar maybeSingle() para evitar erro 406 quando não há assinatura
        const { data: companySubscription, error: companySubscriptionError } = await supabase
          .from('company_subscriptions')
          .select('plan_id')
          .eq('company_id', primaryCompanyId)
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (companySubscriptionError) {
          // Tratar erro 406 (Not Acceptable) especificamente
          if (companySubscriptionError.code === 'PGRST301' || companySubscriptionError.status === 406) {
            console.warn(`useHasFeature: Erro 406 ao buscar assinatura. Verificando RLS ou company_id: ${primaryCompanyId}`);
          }
          console.warn(`useHasFeature: Erro ao buscar assinatura para a empresa ${primaryCompanyId}:`, companySubscriptionError);
          setHasAccess(false);
          setLimit(null);
          setLoading(false);
          return;
        }

        if (!companySubscription || !companySubscription.plan_id) {
          console.warn(`useHasFeature: Nenhuma assinatura encontrada para a empresa ${primaryCompanyId}.`);
          setHasAccess(false);
          setLimit(null);
          setLoading(false);
          return;
        }

        const planId = companySubscription.plan_id;

        // 3. Verificar na tabela pivô se o plano da empresa tem essa funcionalidade
        const { data: planFeature, error: planFeatureError } = await supabase
          .from('plan_features')
          .select('feature_limit') // Seleciona o limite, se existir
          .eq('plan_id', planId)
          .eq('feature_id', featureId)
          .single();

        if (planFeatureError || !planFeature) {
          setHasAccess(false);
          setLimit(null);
        } else {
          setHasAccess(true);
          setLimit(planFeature.feature_limit || null);
        }

      } catch (error: any) {
        console.error(`useHasFeature: Erro ao verificar acesso à funcionalidade ${featureSlug}:`, error);
        showError(`Erro ao verificar acesso à funcionalidade: ${error.message}`);
        setHasAccess(false);
        setLimit(null);
      } finally {
        setLoading(false);
      }
    };

    checkFeatureAccess();
  }, [userId, primaryCompanyId, featureSlug, sessionLoading, loadingPrimaryCompany]);

  return { hasAccess, loading, limit };
}

