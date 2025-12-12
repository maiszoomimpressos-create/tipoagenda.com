import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Check, X, DollarSign, Clock, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: string[] | null;
  duration_months: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'inactive' | 'pending' | 'canceled';
  subscription_plans: Plan;
}

const SubscriptionPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchSubscriptionData = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }

    setLoadingData(true);
    try {
      // 1. Fetch available active plans (RLS handles filtering by 'active')
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name, description, price, features, duration_months')
        .order('price', { ascending: true });

      if (plansError) throw plansError;
      setAvailablePlans(plansData as Plan[]);

      // 2. Fetch current active subscription for the primary company
      const { data: subData, error: subError } = await supabase
        .from('company_subscriptions')
        .select(`
          id,
          plan_id,
          start_date,
          end_date,
          status,
          subscription_plans(id, name, description, price, features, duration_months)
        `)
        .eq('company_id', primaryCompanyId)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 is "No rows found"
        throw subError;
      }
      
      setCurrentSubscription(subData as Subscription | null);

    } catch (error: any) {
      console.error('Erro ao carregar dados de planos/assinatura:', error);
      showError('Erro ao carregar dados de planos: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const handleSubscribe = async (planId: string, price: number) => {
    // Implementar lógica de checkout/pagamento aqui.
    // Por enquanto, simular a ativação de um plano gratuito ou teste.
    
    if (!primaryCompanyId || !session?.user) {
        showError('Erro de autenticação ou empresa primária não encontrada.');
        return;
    }

    if (currentSubscription) {
        showError('Você já possui uma assinatura ativa. Cancele a atual antes de mudar.');
        return;
    }

    // Simulação de Inserção de Assinatura (Assumindo que o pagamento foi processado)
    setLoadingData(true);
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Para planos de teste/grátis, definimos uma data de fim (ex: 30 dias)
        // Para planos pagos, a data de fim seria definida após a confirmação do pagamento.
        const { data, error } = await supabase
            .from('company_subscriptions')
            .insert({
                company_id: primaryCompanyId,
                plan_id: planId,
                start_date: today,
                end_date: null, // Assumindo que é um plano recorrente até ser cancelado
                status: 'active',
            })
            .select()
            .single();

        if (error) throw error;

        showSuccess('Assinatura ativada com sucesso! Bem-vindo ao plano.');
        fetchSubscriptionData(); // Refresh data
    } catch (error: any) {
        console.error('Erro ao assinar plano:', error);
        showError('Erro ao processar assinatura: ' + error.message);
    } finally {
        setLoadingData(false);
    }
  };

  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 text-white">Ativo</Badge>;
      case 'inactive': return <Badge className="bg-gray-500 text-white">Inativo</Badge>;
      case 'pending': return <Badge className="bg-yellow-500 text-black">Pendente</Badge>;
      case 'canceled': return <Badge className="bg-red-500 text-white">Cancelado</Badge>;
      default: return null;
    }
  };

  if (loadingData || sessionLoading || loadingPrimaryCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando planos de assinatura...</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para gerenciar planos.
        </p>
        <Button
          className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          onClick={() => navigate('/register-company')}
        >
          <i className="fas fa-building mr-2"></i>
          Cadastrar Empresa
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Planos de Assinatura</h1>

      {/* Status da Assinatura Atual */}
      <Card className="border-yellow-600 border-2 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-600" />
            Sua Assinatura Atual
          </CardTitle>
          {currentSubscription && getSubscriptionStatusBadge(currentSubscription.status)}
        </CardHeader>
        <CardContent className="space-y-3">
          {currentSubscription ? (
            <>
              <p className="text-2xl font-bold text-yellow-600">{currentSubscription.subscription_plans.name}</p>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> Início: {format(parseISO(currentSubscription.start_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                <p className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Preço: R$ {currentSubscription.subscription_plans.price.toFixed(2).replace('.', ',')} / mês</p>
                {currentSubscription.end_date && (
                    <p className="flex items-center gap-2"><X className="h-4 w-4 text-red-500" /> Expira em: {format(parseISO(currentSubscription.end_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                )}
              </div>
              <Button 
                variant="outline" 
                className="!rounded-button whitespace-nowrap mt-4"
                disabled={currentSubscription.status === 'canceled'}
              >
                Gerenciar / Cancelar Assinatura
              </Button>
            </>
          ) : (
            <p className="text-gray-600">Você não possui uma assinatura ativa. Selecione um plano abaixo para começar.</p>
          )}
        </CardContent>
      </Card>

      {/* Planos Disponíveis */}
      <h2 className="text-2xl font-bold text-gray-900 pt-4">Escolha o Melhor Plano</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {availablePlans.map((plan) => {
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const buttonDisabled = isCurrentPlan || loadingData;
          const buttonText = isCurrentPlan ? 'Plano Atual' : 'Assinar Agora';
          const buttonClass = isCurrentPlan ? 'bg-gray-400 hover:bg-gray-500 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-black';

          return (
            <Card key={plan.id} className={`border-2 ${isCurrentPlan ? 'border-yellow-600 shadow-xl' : 'border-gray-200'}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <p className="text-4xl font-extrabold text-yellow-600 mt-2">
                  R$ {plan.price.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-gray-500">/{plan.duration_months} {plan.duration_months > 1 ? 'meses' : 'mês'}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center text-gray-600">{plan.description}</p>
                <ul className="space-y-2 text-sm text-gray-700">
                  {plan.features?.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`!rounded-button whitespace-nowrap w-full font-semibold py-2.5 text-base ${buttonClass}`}
                  onClick={() => handleSubscribe(plan.id, plan.price)}
                  disabled={buttonDisabled}
                >
                  {buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionPlansPage;