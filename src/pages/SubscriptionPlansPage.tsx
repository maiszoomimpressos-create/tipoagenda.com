import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { useIsClient } from '@/hooks/useIsClient';
import { Check, X, DollarSign, Clock, Zap, Tag, AlertTriangle, Settings, HeadphonesIcon } from 'lucide-react';
import { format, parseISO, addMonths, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input'; // Importar Input
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Importar Dialog
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Menu {
  id: string;
  menu_key: string;
  label: string;
  icon: string;
  description: string | null;
  display_order: number;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: string[] | null;
  duration_months: number;
  menus?: Menu[]; // Menus vinculados ao plano
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
  const { isClient, loadingClientCheck } = useIsClient();

  // Redirecionar clientes para meus agendamentos (planos são apenas para profissionais)
  useEffect(() => {
    if (!sessionLoading && !loadingClientCheck && session && isClient) {
      navigate('/meus-agendamentos', { replace: true });
    }
  }, [sessionLoading, loadingClientCheck, session, isClient, navigate]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [couponCode, setCouponCode] = useState(''); // Novo estado para o cupom
  const [couponValidationMessage, setCouponValidationMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [validatedCoupon, setValidatedCoupon] = useState<{ id: string, discount_type: string, discount_value: number, plan_id: string | null } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false); // Novo estado para o modal de cancelamento
  const [cancelling, setCancelling] = useState(false); // Novo estado para o loading do cancelamento
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly'); // Estado para período de cobrança

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
        .eq('status', 'active')
        .order('price', { ascending: true });

      if (plansError) {
        console.error('plansError:', plansError);
        throw plansError;
      }
      
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
        
      // Buscar menus vinculados a cada plano
      const plansWithMenus = await Promise.all(
        activePlans.map(async (plan) => {
          const { data: menuPlansData, error: menuPlansError } = await supabase
            .from('menu_plans')
            .select('menu_id, menus(id, menu_key, label, icon, description, display_order)')
            .eq('plan_id', plan.id);

          if (menuPlansError) {
            console.error(`Erro ao buscar menus do plano ${plan.name}:`, menuPlansError);
            return { ...plan, menus: [] };
          }

          const menus = (menuPlansData || [])
            .map((mp: any) => mp.menus)
            .filter((menu: any) => menu !== null)
            .sort((a: Menu, b: Menu) => a.display_order - b.display_order) as Menu[];

          return { ...plan, menus };
        })
      );
        
      setAvailablePlans(plansWithMenus);

      // 2. Buscar a assinatura mais recente da empresa (independente do status)
      // Usamos select('*') em uma única linha para evitar qualquer problema de sintaxe no parâmetro select (HTTP 406).
      const { data: subData, error: subError } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', primaryCompanyId)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) {
        console.error('Erro ao buscar assinatura atual:', subError);
        throw subError;
      }

      console.log('Resultado de company_subscriptions para company_id', primaryCompanyId, ':', subData);

      // Enriquecer os dados da assinatura com as informações do plano
      let enrichedSubscription: Subscription | null = null;
      if (subData) {
        // Primeiro, tentar encontrar na lista de planos ativos já carregados
        let planForSubscription = activePlans.find(p => p.id === subData.plan_id) || null;
        
        // Se não encontrou nos planos ativos, buscar diretamente na tabela (pode estar inativo)
        if (!planForSubscription && subData.plan_id) {
          console.log('Plano não encontrado em activePlans, buscando diretamente na tabela subscription_plans para plan_id:', subData.plan_id);
          const { data: planData, error: planError } = await supabase
            .from('subscription_plans')
            .select('id, name, description, price, features, duration_months, status')
            .eq('id', subData.plan_id)
            .single();
          
          if (!planError && planData) {
            planForSubscription = {
              id: planData.id,
              name: planData.name,
              description: planData.description,
              price: planData.price,
              features: planData.features,
              duration_months: planData.duration_months,
            } as Plan;
            console.log('Plano encontrado diretamente na tabela:', planForSubscription);
          } else {
            console.error('Erro ao buscar plano diretamente:', planError);
          }
        }
        
        enrichedSubscription = {
          ...(subData as any),
          subscription_plans: planForSubscription,
        } as Subscription;
      }
      
      setCurrentSubscription(enrichedSubscription);

    } catch (error: any) {
      console.error('Erro ao carregar dados de planos/assinatura:', error);
      showError('Erro ao carregar dados de planos: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId]);

  // Effect to handle Mercado Pago redirects (success/failure)
  useEffect(() => {
    // Aguardar até que a sessão esteja carregada antes de processar o status
    if (sessionLoading) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (!status) {
      return; // Não há status na URL, não fazer nada
    }

    // Verificar se há sessão válida
    if (!session?.user) {
      console.warn('SubscriptionPlansPage - No session found after payment return, redirecting to login');
      showError('Sua sessão expirou. Por favor, faça login novamente.');
      navigate('/login', { replace: true });
      return;
    }

    if (status === 'success') {
      showSuccess('Pagamento aprovado! Sua assinatura será ativada em breve.');
      // Atualizar dados da assinatura antes de redirecionar
      fetchSubscriptionData();
      // Redirecionar para o dashboard após um pequeno delay para mostrar a mensagem
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } else if (status === 'failure') {
      showError('O pagamento falhou. Por favor, tente novamente.');
      // Limpar parâmetros da URL mas manter na página de planos
      navigate('/planos', { replace: true });
    } else if (status === 'pending') {
      showSuccess('Pagamento pendente. Sua assinatura será ativada assim que o pagamento for confirmado.');
      // Atualizar dados da assinatura
      fetchSubscriptionData();
      // Redirecionar para o dashboard após um pequeno delay
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    }
  }, [navigate, fetchSubscriptionData, sessionLoading, session]);

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
        .select('id, discount_type, discount_value, valid_until, max_uses, current_uses, status, plan_id')
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

      // Success! Armazenar também o plan_id do cupom para validação posterior
      setValidatedCoupon({
        id: couponData.id,
        discount_type: couponData.discount_type,
        discount_value: couponData.discount_value,
        plan_id: couponData.plan_id || null, // Adicionar plan_id ao validatedCoupon
      });
      
      const planRestriction = couponData.plan_id 
        ? ' (válido apenas para o plano específico)' 
        : ' (válido para todos os planos)';
      
      setCouponValidationMessage({ type: 'success', message: `Cupom '${couponCode.toUpperCase()}' aplicado!${planRestriction} Você receberá ${couponData.discount_type === 'percentual' ? `${couponData.discount_value}%` : `R$ ${couponData.discount_value.toFixed(2).replace('.', ',')}`} de desconto e 30 dias grátis.` });

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

    // Verificar se há assinatura ativa (não expirada e não cancelada)
    // Recalcular isExpired e isCanceled dentro da função para garantir valores atuais
    const subscriptionIsCanceled = currentSubscription?.status === 'canceled';
    const subscriptionIsExpired = currentSubscription?.end_date ? isPast(parseISO(currentSubscription.end_date)) : false;
    const hasActiveSubscription = currentSubscription && !subscriptionIsExpired && currentSubscription.status === 'active';

    if (hasActiveSubscription) {
        showError('Você já possui uma assinatura ativa. Cancele a atual antes de mudar.');
        return;
    }

    setLoadingData(true);
    try {
        // VALIDAÇÃO: Verificar se o cupom é válido para o plano selecionado
        if (validatedCoupon && validatedCoupon.plan_id) {
          if (validatedCoupon.plan_id !== plan.id) {
            showError(`Este cupom é válido apenas para um plano específico. Por favor, selecione o plano correto ou remova o cupom.`);
            setLoadingData(false);
            return;
          }
        }

        // Calcular preço base baseado no período selecionado
        // Para plano anual: aplicar desconto de 15% sobre o valor anual (12 meses)
        const yearlyBasePrice = plan.price * 12;
        const basePrice = billingPeriod === 'yearly' 
          ? Math.round(yearlyBasePrice * 0.85 * 100) / 100 // 15% de desconto no plano anual
          : plan.price;
        
        // Calcular duração em meses baseado no período selecionado
        const durationMonths = billingPeriod === 'yearly' ? 12 : 1;
        
        // Calcular preço final (com cupom se aplicável)
        let finalPrice = basePrice;
        if (validatedCoupon) {
            if (validatedCoupon.discount_type === 'percentual') {
                finalPrice = Math.round(basePrice * (1 - validatedCoupon.discount_value / 100) * 100) / 100;
            } else if (validatedCoupon.discount_type === 'fixed') {
                finalPrice = Math.max(0, Math.round((basePrice - validatedCoupon.discount_value) * 100) / 100);
            }
        }
        
        // Garantir que o preço final tenha no máximo 2 casas decimais
        finalPrice = Math.round(finalPrice * 100) / 100;

        // A partir daqui, TODA a lógica de adesão/ativação de plano (com ou sem pagamento)
        // é centralizada na Edge Function `apply-coupon-and-subscribe`.
        // Ela mesma decide se:
        // - ativa diretamente (quando finalPrice <= 0, ex: 100% desconto), ou
        // - encaminha para o Mercado Pago (quando finalPrice > 0).

        // Validate required fields before calling Edge Function
        if (!plan.id || !primaryCompanyId || !plan.name || plan.price === undefined || plan.price === null) {
            throw new Error('Dados do plano incompletos. Por favor, recarregue a página e tente novamente.');
        }

        // Convert and validate price
        const numericPrice = Number(finalPrice);
        const numericDuration = Number(durationMonths);

        if (isNaN(numericPrice) || numericPrice < 0) {
            throw new Error('Preço do plano inválido.');
        }

        if (isNaN(numericDuration) || numericDuration <= 0 || !Number.isInteger(numericDuration)) {
            throw new Error('Duração do plano inválida.');
        }

        const requestBody = {
            planId: String(plan.id),
            companyId: String(primaryCompanyId),
            planName: String(plan.name),
            planPrice: numericPrice,
            durationMonths: numericDuration,
            coupon: validatedCoupon ? {
                id: String(validatedCoupon.id),
                discount_type: String(validatedCoupon.discount_type),
                discount_value: Number(validatedCoupon.discount_value),
            } : null,
        };

        console.log('SubscriptionPlansPage - Sending request:', {
            planId: requestBody.planId,
            companyId: requestBody.companyId,
            planName: requestBody.planName,
            planPrice: requestBody.planPrice,
            durationMonths: requestBody.durationMonths,
            coupon: requestBody.coupon ? { id: requestBody.coupon.id, discount_type: requestBody.coupon.discount_type, discount_value: requestBody.coupon.discount_value } : null,
        });

        const response = await supabase.functions.invoke('apply-coupon-and-subscribe', {
            body: JSON.stringify(requestBody),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
        });

        // Check if response has an error
        if (response.error) {
            let edgeFunctionErrorMessage = 'Erro desconhecido da Edge Function.';
            
            // Try to extract error message from different possible response structures
            if (response.error.context?.data) {
                if (typeof response.error.context.data === 'string') {
                    try {
                        const parsedError = JSON.parse(response.error.context.data);
                        edgeFunctionErrorMessage = parsedError.error || edgeFunctionErrorMessage;
                    } catch {
                        edgeFunctionErrorMessage = response.error.context.data;
                    }
                } else if (response.error.context.data.error) {
                    edgeFunctionErrorMessage = response.error.context.data.error;
                }
            } else if (response.error.message) {
                edgeFunctionErrorMessage = response.error.message;
            }
            
            throw new Error(edgeFunctionErrorMessage);
        }

        // Also check if response.data has an error field (Edge Function might return error in data)
        if (response.data && typeof response.data === 'object' && 'error' in response.data) {
            const errorData = response.data as { error: string };
            throw new Error(errorData.error || 'Erro desconhecido da Edge Function.');
        }

        const responseData = response.data as { 
            initPoint?: string | null, 
            subscriptionId?: string | null,
            message?: string,
            preferenceId?: string,
            paymentAttemptId?: string
        };

        if (responseData.initPoint) {
            window.location.href = responseData.initPoint;
        } else if (responseData.subscriptionId) {
            showSuccess('Assinatura ativada com sucesso! Aproveite seu período de teste.');
            fetchSubscriptionData();
        } else if (responseData.message) {
            showSuccess(responseData.message);
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
  const isExpired = currentSubscription?.end_date ? isPast(parseISO(currentSubscription.end_date)) : false; // Nova variável
  const expirationDateFormatted = currentSubscription?.end_date 
    ? format(parseISO(currentSubscription.end_date), 'dd/MM/yyyy', { locale: ptBR }) 
    : 'N/A';

  // Ajustar o status para exibição
  let displayStatus = currentSubscription?.status;
  if (displayStatus !== 'canceled' && isExpired) {
    displayStatus = 'expired'; // Priorizar 'expired' se não for 'canceled'
  }

  console.log('--- Debug SubscriptionPlansPage ---');
  console.log('currentSubscription:', currentSubscription);
  console.log('currentSubscription.end_date:', currentSubscription?.end_date);
  if (currentSubscription?.end_date) {
    const parsedEndDate = parseISO(currentSubscription.end_date);
    console.log('Parsed End Date:', parsedEndDate);
    console.log('isPast(Parsed End Date):', isPast(parsedEndDate));
  }
  console.log('isExpired:', isExpired);
  console.log('currentSubscription.status (raw):', currentSubscription?.status);
  console.log('displayStatus (final):', displayStatus);
  console.log('Current Date (for reference):', new Date());
  console.log('-----------------------------------');

  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 text-white">Ativo</Badge>;
      case 'inactive': return <Badge className="bg-gray-500 text-white">Inativo</Badge>;
      case 'pending': return <Badge className="bg-yellow-500 text-black">Pendente</Badge>;
      case 'canceled': return <Badge className="bg-red-500 text-white">Cancelado</Badge>;
      case 'expired': return <Badge className="bg-red-500 text-white">Expirado</Badge>; // Novo badge
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Planos de Assinatura</h1>

      {/* Status da Assinatura Atual */}
      <Card className={`border-2 shadow-lg ${isCanceled || isExpired ? 'border-red-600 bg-red-50' : 'border-yellow-600'}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={`text-xl text-gray-900 flex items-center gap-2 ${isCanceled || isExpired ? 'text-red-600' : 'text-yellow-600'}`}>
            {isCanceled || isExpired ? <AlertTriangle className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
            {isExpired && !isCanceled ? 'Assinatura Expirada' : 'Sua Assinatura Atual'}
          </CardTitle>
          {currentSubscription && displayStatus && getSubscriptionStatusBadge(displayStatus)}
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
              disabled={loadingData || (currentSubscription && !isExpired && !isCanceled && currentSubscription.status === 'active')}
            />
            <Button 
              onClick={handleValidateCoupon} 
              disabled={loadingData || !couponCode || (currentSubscription && !isExpired && !isCanceled && currentSubscription.status === 'active')}
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
      <div className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Escolha o Melhor Plano</h2>
          <div className="flex items-center">
            <ToggleGroup 
              type="single" 
              value={billingPeriod} 
              onValueChange={(value) => {
                if (value === 'monthly' || value === 'yearly') {
                  setBillingPeriod(value);
                }
              }}
              className="border border-gray-300 rounded-lg p-1"
            >
              <ToggleGroupItem 
                value="monthly" 
                aria-label="Mensal"
                className={`px-4 py-2 rounded-md ${billingPeriod === 'monthly' ? 'bg-yellow-600 text-black' : 'bg-transparent text-gray-600'}`}
              >
                Mensal
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="yearly" 
                aria-label="Anual"
                className={`px-4 py-2 rounded-md ${billingPeriod === 'yearly' ? 'bg-yellow-600 text-black' : 'bg-transparent text-gray-600'}`}
              >
                Anual
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {billingPeriod === 'yearly' && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="bg-green-500 text-white rounded-full p-1">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-green-900">
                  🎉 Desconto Especial de 15% no Plano Anual!
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Economize ao pagar 12 meses de uma vez. O desconto já está aplicado nos preços abaixo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {availablePlans.map((plan) => {
          if (!plan) return null; 
          
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          
          // Lógica de desabilitação corrigida:
          // 1. Desabilita se estiver carregando dados.
          // 2. Desabilita se for o plano atual E o status for 'active' E não estiver expirado (não pode assinar o mesmo plano ativo).
          // 3. Permite se o status for 'canceled' ou 'expired' (re-assinatura).
          const isCurrentAndActive = isCurrentPlan && displayStatus === 'active' && !isExpired;
          const buttonDisabled = loadingData || isCurrentAndActive;
          
          const buttonText = isCurrentPlan && displayStatus === 'active' && !isExpired ? 'Plano Atual' : 'Assinar Agora';
          const buttonClass = isCurrentPlan && displayStatus === 'active' && !isExpired ? 'bg-gray-400 hover:bg-gray-500 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-black';

          // Calcular preço base baseado no período selecionado
          // Para plano anual: aplicar desconto de 15% sobre o valor anual (12 meses)
          const yearlyBasePrice = plan.price * 12;
          const basePrice = billingPeriod === 'yearly' 
            ? Math.round(yearlyBasePrice * 0.85 * 100) / 100 // 15% de desconto no plano anual
            : plan.price;
          
          // Calcular valor sem desconto anual para exibição
          const priceWithoutYearlyDiscount = billingPeriod === 'yearly' ? yearlyBasePrice : plan.price;

          // Calculate discounted price for display
          let finalPrice = basePrice;
          let discountApplied = false;
          
          if (validatedCoupon) {
            if (validatedCoupon.discount_type === 'percentual') {
              finalPrice = Math.round(basePrice * (1 - validatedCoupon.discount_value / 100) * 100) / 100;
            } else if (validatedCoupon.discount_type === 'fixed') {
              finalPrice = Math.max(0, Math.round((basePrice - validatedCoupon.discount_value) * 100) / 100);
            }
            discountApplied = finalPrice < basePrice;
          }
          
          // Garantir que o preço final tenha no máximo 2 casas decimais
          finalPrice = Math.round(finalPrice * 100) / 100;
          
          // Calcular período de duração para exibição
          const displayDuration = billingPeriod === 'yearly' ? 12 : 1;
          
          // Calcular economia do desconto anual (15%)
          const yearlySavings = billingPeriod === 'yearly' 
            ? Math.round((yearlyBasePrice - basePrice) * 100) / 100 
            : 0;

          return (
            <Card key={plan.id} className={`border-2 ${isCurrentPlan ? 'border-yellow-600 shadow-xl' : 'border-gray-200'}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="flex justify-center items-center mt-2">
                  {/* Botão para gerenciar funcionalidades do plano */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que o clique no botão ative a lógica do card (se houver)
                      navigate(`/admin-dashboard/plans/${plan.id}/features`);
                    }}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
                <div className="mt-4">
                  {billingPeriod === 'yearly' && (
                    <p className="text-lg font-semibold text-gray-400 line-through mb-1">
                      R$ {priceWithoutYearlyDiscount.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  {discountApplied && billingPeriod === 'monthly' && (
                    <p className="text-xl font-semibold text-gray-400 line-through mb-1">
                      R$ {basePrice.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  <p className="text-4xl font-extrabold text-yellow-600">
                    R$ {finalPrice.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-sm text-gray-500">
                    /{displayDuration} {displayDuration > 1 ? 'meses' : 'mês'}
                    {billingPeriod === 'yearly' && yearlySavings > 0 && (
                      <span className="block text-xs text-green-600 font-semibold mt-1">
                        💰 Você economiza R$ {yearlySavings.toFixed(2).replace('.', ',')} com 15% de desconto!
                      </span>
                    )}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-center text-gray-600">{plan.description}</p>
                  
                  {/* Badge de Suporte baseado no plano */}
                  {(() => {
                    const planName = plan.name.toLowerCase();
                    if (planName.includes('platinum')) {
                      return (
                        <div className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Suporte em horário comercial</span>
                        </div>
                      );
                    } else if (planName.includes('full')) {
                      return (
                        <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <Zap className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">Suporte 24hrs</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                {/* Exibir menus vinculados ao plano */}
                {plan.menus && plan.menus.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Módulos Inclusos:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {plan.menus.map((menu) => (
                        <li key={menu.id} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{menu.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  /* Fallback para features antigas se não houver menus */
                  plan.features && plan.features.length > 0 && (
                <ul className="space-y-2 text-sm text-gray-700">
                      {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                  )
                )}
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