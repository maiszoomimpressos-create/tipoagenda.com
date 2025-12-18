import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Check, X, DollarSign, Clock, Zap, Tag, AlertTriangle } from 'lucide-react';
import { format, parseISO, addMonths, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input'; // Importar Input
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Importar Dialog

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
  const [couponCode, setCouponCode] = useState(''); // Novo estado para o cupom
  const [couponValidationMessage, setCouponValidationMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [validatedCoupon, setValidatedCoupon] = useState<{ id: string, discount_type: string, discount_value: number } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false); // Novo estado para o modal de cancelamento
  const [cancelling, setCancelling] = useState(false); // Novo estado para o loading do cancelamento

  const fetchSubscriptionData = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }

    setLoadingData(true);
    try {
      // 1. Fetch available active plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name, description, price, features, duration_months, status') // Incluindo status na busca
        .order('price', { ascending: true });

      if (plansError) throw plansError;
      
      // Filtrar apenas planos ativos para a lista de planos disponíveis para assinatura
      const activePlans = plansData
        .filter(p => p !== null && p.status === 'active')
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          features: p.features,
          duration_months: p.duration_months,
        })) as Plan[];
        
      setAvailablePlans(activePlans);

      // 2. Fetch current active subscription for the primary company
      // Fetch the most recent subscription regardless of status to show cancellation status
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
        .order('start_date', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') {
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

  // Effect to handle Mercado Pago redirects (success/failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status === 'success') {
      showSuccess('Pagamento aprovado! Sua assinatura será ativada em breve.');
      navigate('/planos', { replace: true });
      fetchSubscriptionData();
    } else if (status === 'failure') {
      showError('O pagamento falhou. Por favor, tente novamente.');
      navigate('/planos', { replace: true });
    } else if (status === 'pending') {
      showSuccess('Pagamento pendente. Sua assinatura será ativada assim que o pagamento for confirmado.');
      navigate('/planos', { replace: true });
    }
  }, [navigate, fetchSubscriptionData]);

  const handleValidateCoupon = async () => {
    if (!couponCode || !primaryCompanyId || !session?.user) {
      setCouponValidationMessage({ type: 'error', message: 'Insira um código de cupom.' });
      return;
    }

    setLoadingData(true);
    setCouponValidationMessage(null);
    setValidatedCoupon(null);

    try {
      // 1. Check if coupon exists and is active
      const { data: couponData, error: couponError } = await supabase
        .from('admin_coupons')
        .select('id, discount_type, discount_value, valid_until, max_uses, current_uses, status')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (couponError || !couponData) {
        throw new Error('Cupom inválido ou não encontrado.');
      }

      if (couponData.status !== 'active') {
        throw new Error('Cupom inativo.');
      }

      if (couponData.valid_until && isPast(parseISO(couponData.valid_until))) {
        throw new Error('Cupom expirado.');
      }

      if (couponData.current_uses >= couponData.max_uses) {
        throw new Error('Cupom atingiu o limite máximo de usos.');
      }

      // 2. Check if company already used this coupon (using the new table)
      const { data: usageData, error: usageError } = await supabase
        .from('coupon_usages')
        .select('id')
        .eq('company_id', primaryCompanyId)
        .eq('admin_coupon_id', couponData.id)
        .limit(1);

      if (usageError) throw usageError;

      if (usageData && usageData.length > 0) {
        throw new Error('Esta empresa já utilizou este cupom.');
      }

      // Success!
      setValidatedCoupon({
        id: couponData.id,
        discount_type: couponData.discount_type,
        discount_value: couponData.discount_value,
      });
      setCouponValidationMessage({ type: 'success', message: `Cupom '${couponCode.toUpperCase()}' aplicado! Você receberá ${couponData.discount_type === 'percentual' ? `${couponData.discount_value}%` : `R$ ${couponData.discount_value.toFixed(2).replace('.', ',')}`} de desconto e 30 dias grátis.` });

    } catch (error: any) {
      setCouponValidationMessage({ type: 'error', message: error.message });
      setValidatedCoupon(null);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!primaryCompanyId || !session?.user) {
        showError('Erro de autenticação ou empresa primária não encontrada.');
        return;
    }

    if (currentSubscription && currentSubscription.status === 'active') {
        showError('Você já possui uma assinatura ativa. Cancele a atual antes de mudar.');
        return;
    }

    setLoadingData(true);
    try {
        // Call the new Edge Function to handle coupon application and payment initiation
        const response = await supabase.functions.invoke('apply-coupon-and-subscribe', {
            body: JSON.stringify({
                planId: plan.id,
                companyId: primaryCompanyId,
                planName: plan.name,
                planPrice: plan.price,
                durationMonths: plan.duration_months,
                coupon: validatedCoupon, // Pass validated coupon data
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
        });

        if (response.error) {
            let edgeFunctionErrorMessage = 'Erro desconhecido da Edge Function.';
            if (response.error.context && response.error.context.data && response.error.context.data.error) {
                edgeFunctionErrorMessage = response.error.context.data.error;
            } else if (response.error.message) {
                edgeFunctionErrorMessage = response.error.message;
            }
            throw new Error(edgeFunctionErrorMessage);
        }

        const { initPoint, subscriptionId } = response.data as { initPoint: string | null, subscriptionId: string | null };

        if (initPoint) {
            // Redirect user to Mercado Pago payment page
            window.location.href = initPoint;
        } else if (subscriptionId) {
            // Subscription was activated immediately (e.g., 100% discount or free trial applied)
            showSuccess('Assinatura ativada com sucesso! Aproveite seu período de teste.');
            fetchSubscriptionData();
        } else {
            throw new Error('Resposta de pagamento inválida.');
        }

    } catch (error: any) {
        console.error('Erro ao iniciar pagamento:', error);
        showError('Erro ao iniciar pagamento: ' + (error.message || 'Erro desconhecido.'));
    } finally {
        setLoadingData(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription || !primaryCompanyId) return;

    setCancelling(true);
    try {
      // Update the subscription status to 'canceled'
      const { error } = await supabase
        .from('company_subscriptions')
        .update({ status: 'canceled' })
        .eq('id', currentSubscription.id)
        .eq('company_id', primaryCompanyId);

      if (error) throw error;

      const expirationDateFormatted = currentSubscription.end_date 
        ? format(parseISO(currentSubscription.end_date), 'dd/MM/yyyy', { locale: ptBR }) 
        : 'N/A';

      showSuccess(`Assinatura cancelada com sucesso! Você manterá o acesso até a data de expiração: ${expirationDateFormatted}.`);
      fetchSubscriptionData(); // Re-fetch data to update UI
      setIsCancelModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      showError('Erro ao cancelar assinatura: ' + error.message);
    } finally {
      setCancelling(false);
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

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);


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
  
  const isCanceled = currentSubscription?.status === 'canceled';
  const expirationDateFormatted = currentSubscription?.end_date 
    ? format(parseISO(currentSubscription.end_date), 'dd/MM/yyyy', { locale: ptBR }) 
    : 'N/A';

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Planos de Assinatura</h1>

      {/* Status da Assinatura Atual */}
      <Card className={`border-2 shadow-lg ${isCanceled ? 'border-red-600 bg-red-50' : 'border-yellow-600'}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={`text-xl text-gray-900 flex items-center gap-2 ${isCanceled ? 'text-red-600' : 'text-yellow-600'}`}>
            {isCanceled ? <AlertTriangle className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
            Sua Assinatura Atual
          </CardTitle>
          {currentSubscription && getSubscriptionStatusBadge(currentSubscription.status)}
        </CardHeader>
        <CardContent className="space-y-3">
          {currentSubscription ? (
            <>
              <p className="text-2xl font-bold text-gray-900">{currentSubscription.subscription_plans?.name || 'Plano Desconhecido'}</p>
              
              {isCanceled && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-3">
                    <X className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-semibold text-red-800">
                        Assinatura Cancelada. Você manterá o acesso até a data de expiração: <span className="font-bold">{expirationDateFormatted}</span>.
                    </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> Início: {format(parseISO(currentSubscription.start_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                <p className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Preço: R$ {currentSubscription.subscription_plans?.price?.toFixed(2).replace('.', ',') || '0,00'} / {currentSubscription.subscription_plans?.duration_months} {currentSubscription.subscription_plans?.duration_months && currentSubscription.subscription_plans.duration_months > 1 ? 'meses' : 'mês'}</p>
                {currentSubscription.end_date && (
                    <p className="flex items-center gap-2"><X className="h-4 w-4 text-red-500" /> Expira em: {expirationDateFormatted}</p>
                )}
              </div>
              <Button 
                variant="outline" 
                className="!rounded-button whitespace-nowrap mt-4"
                disabled={isCanceled || loadingData}
                onClick={() => setIsCancelModalOpen(true)} // Abre o modal de cancelamento
              >
                {isCanceled ? 'Assinatura Cancelada' : 'Gerenciar / Cancelar Assinatura'}
              </Button>
            </>
          ) : (
            <p className="text-gray-600">Você não possui uma assinatura ativa. Selecione um plano abaixo para começar.</p>
          )}
        </CardContent>
      </Card>
      
      {/* Seção de Cupom */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-blue-600" />
            Aplicar Cupom de Desconto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Insira o código do cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1"
              disabled={loadingData || !!currentSubscription}
            />
            <Button 
              onClick={handleValidateCoupon} 
              disabled={loadingData || !couponCode || !!currentSubscription}
              className="!rounded-button whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loadingData ? 'Validando...' : 'Aplicar'}
            </Button>
          </div>
          {couponValidationMessage && (
            <p className={`text-sm ${couponValidationMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {couponValidationMessage.message}
            </p>
          )}
          {validatedCoupon && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex justify-between items-center">
              <span>Cupom {validatedCoupon.id.substring(0, 8)}... aplicado.</span>
              <Button variant="ghost" size="sm" onClick={() => { setValidatedCoupon(null); setCouponCode(''); setCouponValidationMessage(null); }}>
                <X className="h-4 w-4 text-green-800" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Planos Disponíveis */}
      <h2 className="text-2xl font-bold text-gray-900 pt-4">Escolha o Melhor Plano</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {availablePlans.map((plan) => {
          if (!plan) return null; 
          
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const buttonDisabled = isCurrentPlan || loadingData || !!currentSubscription;
          const buttonText = isCurrentPlan ? 'Plano Atual' : 'Assinar Agora';
          const buttonClass = isCurrentPlan ? 'bg-gray-400 hover:bg-gray-500 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-black';

          // Calculate discounted price for display
          let finalPrice = plan.price;
          let discountApplied = false;
          
          if (validatedCoupon) {
            if (validatedCoupon.discount_type === 'percentual') {
              finalPrice = plan.price * (1 - validatedCoupon.discount_value / 100);
            } else if (validatedCoupon.discount_type === 'fixed') {
              finalPrice = Math.max(0, plan.price - validatedCoupon.discount_value);
            }
            discountApplied = finalPrice < plan.price;
          }

          return (
            <Card key={plan.id} className={`border-2 ${isCurrentPlan ? 'border-yellow-600 shadow-xl' : 'border-gray-200'}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="mt-4">
                  {discountApplied && (
                    <p className="text-xl font-semibold text-gray-400 line-through">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <p className="text-4xl font-extrabold text-yellow-600">
                    R$ {finalPrice.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-sm text-gray-500">/{plan.duration_months} {plan.duration_months && plan.duration_months > 1 ? 'meses' : 'mês'}</p>
                </div>
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
                  onClick={() => handleSubscribe(plan)}
                  disabled={buttonDisabled}
                >
                  {buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancellation Confirmation Dialog */}
      {currentSubscription && (
        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Cancelamento</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja cancelar sua assinatura do plano "{currentSubscription.subscription_plans?.name}"? 
                Você manterá o acesso até a data de expiração, {expirationDateFormatted}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={cancelling}>
                Manter Assinatura
              </Button>
              <Button variant="destructive" onClick={handleCancelSubscription} disabled={cancelling}>
                {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SubscriptionPlansPage;