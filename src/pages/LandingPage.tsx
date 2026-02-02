import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Link, useNavigate } from 'react-router-dom'; // Adicionar Link
import { setTargetCompanyId, getTargetCompanyId } from '@/utils/storage';
import { useSession } from '@/components/SessionContextProvider';
import { useIsClient } from '@/hooks/useIsClient';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { useIsCompanyAdmin } from '@/hooks/useIsCompanyAdmin';
import { useIsGlobalAdmin } from '@/hooks/useIsGlobalAdmin';
import { CompanySelectionModal } from '@/components/CompanySelectionModal';
import { useActivePlans } from '@/hooks/useActivePlans';
import { Check, Zap, Search, MapPin, Phone, MessageSquare, PhoneCall, Menu, CalendarDays, Tag } from 'lucide-react'; // Adicionar Menu e CalendarDays
import { Input } from '@/components/ui/input';
import ContactRequestModal from '@/components/ContactRequestModal'; // Importar o novo modal
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"; // Importar DropdownMenu
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Importar componentes de diálogo
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { isClient, loadingClientCheck } = useIsClient();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const { isCompanyAdmin, loadingCompanyAdminCheck } = useIsCompanyAdmin();
  const { isGlobalAdmin, loadingGlobalAdminCheck } = useIsGlobalAdmin();
  const { plans, loading: loadingPlans } = useActivePlans();
  
  // Buscar menus vinculados aos planos
  useEffect(() => {
    const fetchPlansWithMenus = async () => {
      if (!plans || plans.length === 0) {
        console.log('[LandingPage] Nenhum plano disponível');
        setPlansWithMenus([]);
        return;
      }

      console.log('[LandingPage] Buscando menus para', plans.length, 'planos');

      try {
        const plansWithMenusData = await Promise.all(
          plans.map(async (plan) => {
            console.log(`[LandingPage] Buscando menus do plano: ${plan.name} (${plan.id})`);
            
            const { data: menuPlansData, error: menuPlansError } = await supabase
              .from('menu_plans')
              .select('menu_id, menus(id, menu_key, label, icon, description, display_order)')
              .eq('plan_id', plan.id);

            if (menuPlansError) {
              console.error(`[LandingPage] Erro ao buscar menus do plano ${plan.name}:`, menuPlansError);
              return { ...plan, menus: [] };
            }

            console.log(`[LandingPage] Dados brutos de menu_plans para ${plan.name}:`, menuPlansData);

            const menus = (menuPlansData || [])
              .map((mp: any) => mp.menus)
              .filter((menu: any) => menu !== null && menu !== undefined)
              .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

            console.log(`[LandingPage] Menus processados para ${plan.name}:`, menus.length, menus.map((m: any) => m.label));

            return { ...plan, menus };
          })
        );

        console.log('[LandingPage] Planos com menus carregados:', plansWithMenusData.map((p: any) => ({
          name: p.name,
          menusCount: p.menus?.length || 0
        })));

        setPlansWithMenus(plansWithMenusData);
      } catch (error) {
        console.error('[LandingPage] Erro ao buscar menus dos planos:', error);
        setPlansWithMenus(plans.map(p => ({ ...p, menus: [] })));
      }
    };

    if (!loadingPlans) {
      fetchPlansWithMenus();
    }
  }, [plans, loadingPlans]);
  
  const [searchTerm, setSearchTerm] = useState(''); // Estado para busca (mantido para UI, mas não usado para empresas)
  const [locationTerm, setLocationTerm] = useState(''); // Novo estado para localização
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false); // Novo estado para o modal de contato
  const [isConfirmLogoutDialogOpen, setIsConfirmLogoutDialogOpen] = useState(false); // Novo estado para o diálogo de confirmação de logout
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly'); // Estado para período de cobrança
  const [plansWithMenus, setPlansWithMenus] = useState<any[]>([]); // Planos com menus vinculados

  const loadingRoles = loadingProprietarioCheck || loadingCompanyAdminCheck || loadingGlobalAdminCheck || loadingClientCheck;

  const categories = [
    { id: 'todos', name: 'Todos os Serviços', icon: 'fas fa-th-large' },
    { id: 'beleza', name: 'Beleza & Estética', icon: 'fas fa-spa' },
    { id: 'saude', name: 'Saúde & Bem-estar', icon: 'fas fa-heartbeat' },
    { id: 'fitness', name: 'Fitness & Personal', icon: 'fas fa-dumbbell' },
    { id: 'educacao', name: 'Educação & Coaching', icon: 'fas fa-graduation-cap' },
    { id: 'negocios', name: 'Consultoria & Negócios', icon: 'fas fa-briefcase' },
    { id: 'casa', name: 'Casa & Manutenção', icon: 'fas fa-home' },
    { id: 'auto', name: 'Automotivo', icon: 'fas fa-car' },
    { id: 'pet', name: 'Pet Care', icon: 'fas fa-paw' }
  ];

  // NOTA: O redirecionamento pós-login é tratado pelo Index.tsx
  // Esta página não deve fazer redirecionamentos automáticos

  // Logic to open the selection modal if the user is a client and just logged in without a target company

  const handleProfessionalSignup = () => {
    // Redireciona para a nova página de cadastro unificado
    navigate('/register-professional');
  };

  const handleCompanySelected = (companyId: string) => {
    setTargetCompanyId(companyId);
    setIsSelectionModalOpen(false);
    navigate(`/agendar/${companyId}`, { replace: true });
  };
  
  // Determine the most expensive plan for visual highlight (usando plansWithMenus se disponível, senão plans)
  const plansToUse = plansWithMenus.length > 0 ? plansWithMenus : plans;
  const highestPricedPlan = plansToUse.reduce((max, plan) => (plan.price > max.price ? plan : max), plansToUse[0] || { price: -1 });

  return (
    <div className="min-h-screen bg-white">
      {/* Header Customizado para Landing Page */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
              <CalendarDays className="text-white h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">TipoAgenda</h1>
          </Link>

          {/* Barra de Busca Centralizada */}
          <div className="flex-1 max-w-md mx-auto relative hidden md:block">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar..."
              className="pl-12 h-10 rounded-full border-gray-200 focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Menu de Login/Cadastro */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="!rounded-button">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {session ? (
                <>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    supabase.auth.signOut();
                    navigate('/'); // Redireciona para a landing page após logout
                  }}>
                    Sair
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate('/login')}>
                    Login/Cadastro
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/register-professional')}>
                    Cadastro da Empresa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="relative flex items-center justify-center bg-white pt-20 pb-10 min-h-[500px]" // Fundo branco e altura ajustada
      >
        <div className="container mx-auto px-6 text-center text-gray-900">
          <h1 className="text-5xl font-bold mb-4 leading-tight text-gray-900">
            Encontre o Serviço Ideal
          </h1>
          <p className="text-lg mb-6 max-w-3xl mx-auto text-gray-600">
            Navegue pelas categorias ou use a busca para encontrar o que você precisa.
          </p>

          {/* Search Bar (novo design) */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Que serviço você procura?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Sua localização (Cidade/Estado)"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                    className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
                  />
                </div>
                <Button 
                  className="!rounded-button whitespace-nowrap h-14 text-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-black"
                  onClick={() => {}} // Botão desabilitado - empresas não são mais exibidas
                  disabled
                >
                  <Search className="h-5 w-5 mr-2" />
                  Buscar Serviços
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (New) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Planos Para Profissionais</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Escolha o plano ideal para gerenciar seu negócio e crescer sem limites.
            </p>
            
            {/* Toggle Mensal/Anual */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Mensal
              </span>
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
              <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                Anual
              </span>
            </div>
            
            {/* Banner de desconto anual */}
            {billingPeriod === 'yearly' && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 max-w-2xl mx-auto mb-8">
                <div className="flex items-center gap-2 justify-center">
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

          {loadingPlans ? (
            <p className="text-center text-gray-600">Carregando planos...</p>
          ) : plansWithMenus.length === 0 ? (
            <p className="text-center text-gray-600">Nenhum plano ativo disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plansWithMenus.map((plan) => {
                // Verifica se este é o plano mais caro para destaque
                const isFeatured = plan.id === highestPricedPlan.id;
                const cardClasses = isFeatured 
                  ? 'border-4 border-yellow-600 shadow-2xl scale-105' 
                  : 'border-2 border-gray-200 hover:border-yellow-600 transition-all shadow-lg';
                
                // Calcular preço base baseado no período selecionado
                const yearlyBasePrice = plan.price * 12;
                const basePrice = billingPeriod === 'yearly' 
                  ? Math.round(yearlyBasePrice * 0.85 * 100) / 100 // 15% de desconto no plano anual
                  : plan.price;
                
                // Calcular valor sem desconto anual para exibição
                const priceWithoutYearlyDiscount = billingPeriod === 'yearly' ? yearlyBasePrice : plan.price;
                
                // Calcular período de duração para exibição
                const displayDuration = billingPeriod === 'yearly' ? 12 : 1;
                
                // Calcular economia do desconto anual (15%)
                const yearlySavings = billingPeriod === 'yearly' 
                  ? Math.round((yearlyBasePrice - basePrice) * 100) / 100 
                  : 0;

                return (
                  <Card key={plan.id} className={cardClasses}>
                    {isFeatured && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Zap className="h-3 w-3" /> MAIS POPULAR
                      </div>
                    )}
                    <CardHeader className="text-center pt-8">
                      <CardTitle className="text-3xl font-bold text-gray-900">{plan.name}</CardTitle>
                      <div className="mt-4">
                        {billingPeriod === 'yearly' && (
                          <p className="text-lg font-semibold text-gray-400 line-through mb-1">
                            R$ {priceWithoutYearlyDiscount.toFixed(2).replace('.', ',')}
                          </p>
                        )}
                        <p className="text-5xl font-extrabold text-yellow-600">
                          R$ {basePrice.toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-base text-gray-500">
                          /{displayDuration} {displayDuration > 1 ? 'meses' : 'mês'}
                          {billingPeriod === 'yearly' && yearlySavings > 0 && (
                            <span className="block text-xs text-green-600 font-semibold mt-1">
                              💰 Você economiza R$ {yearlySavings.toFixed(2).replace('.', ',')} com 15% de desconto!
                            </span>
                          )}
                        </p>
                        {billingPeriod === 'monthly' && (
                          <p className="text-xs text-gray-400 mt-1">
                            ou R$ {basePrice.toFixed(2).replace('.', ',')}/ano com <span className="font-semibold text-green-600">15% de desconto</span>
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-center text-gray-600">{plan.description}</p>
                      
                      {/* Exibir menus vinculados ao plano */}
                      {(() => {
                        console.log(`[LandingPage] Renderizando card do plano ${plan.name}:`, {
                          hasMenus: !!plan.menus,
                          menusLength: plan.menus?.length || 0,
                          menus: plan.menus,
                          hasFeatures: !!plan.features,
                          featuresLength: plan.features?.length || 0
                        });
                        
                        if (plan.menus && plan.menus.length > 0) {
                          return (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Módulos Inclusos:
                              </p>
                              <ul className="space-y-2 text-sm text-gray-700">
                                {plan.menus.map((menu: any) => (
                                  <li key={menu.id || menu.menu_key} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    <span>{menu.label || menu.menu_key}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        } else if (plan.features && plan.features.length > 0) {
                          // Fallback para features antigas se não houver menus
                          return (
                            <ul className="space-y-3 text-sm text-gray-700 border-t pt-4">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-500 text-center">
                              Nenhum módulo configurado para este plano.
                            </p>
                          );
                        }
                      })()}
                      
                      <Button
                        className="!rounded-button whitespace-nowrap w-full font-semibold py-2.5 text-base bg-yellow-600 hover:bg-yellow-700 text-black"
                        onClick={handleProfessionalSignup} // Redireciona para o cadastro unificado
                      >
                        Começar Agora
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Por Categoria</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Encontre exatamente o que precisa navegando pelas nossas categorias especializadas
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {categories.slice(1).map((category) => (
              <Card
                key={category.id}
                className={`border-2 cursor-pointer transition-all hover:shadow-lg ${
                  selectedCategory === category.id
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 hover:border-yellow-200'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    selectedCategory === category.id
                      ? 'bg-yellow-400 text-black'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <i className={`${category.icon} text-2xl`}></i>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Services/Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Removido a seção de cards de empresas */}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-xl text-gray-600">Agendar nunca foi tão simples e rápido</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Busque e Compare',
                description: 'Encontre profissionais qualificados na sua região e compare preços e avaliações',
                icon: 'fas fa-search'
              },
              {
                step: '2',
                title: 'Escolha o Horário',
                description: 'Selecione o dia e horário que funciona melhor para você em tempo real',
                icon: 'fas fa-calendar-check'
              },
              {
                step: '3',
                title: 'Confirme e Relaxe',
                description: 'Receba confirmação instantânea e lembretes automáticos do seu agendamento',
                icon: 'fas fa-check-circle'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className={`${item.icon} text-2xl text-black`}></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  <span className="text-yellow-600">#{item.step}</span> {item.title}
                </h3>
                <p className="text-gray-600 text-lg">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção de Contato (Agora com Cards) */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-12">
            Vamos conversar sobre o seu negócio?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            
            {/* Card 1: Ligue Gratuitamente */}
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardContent className="p-6 space-y-4">
                <PhoneCall className="h-12 w-12 mx-auto text-purple-500" />
                <h3 className="text-xl font-semibold">Ligue Gratuitamente</h3>
                <a 
                  href="tel:+5546988212387" 
                  className="text-gray-400 hover:text-white transition-colors text-sm block"
                >
                  +55 46 98821-2387
                </a>
              </CardContent>
            </Card>

            {/* Card 2: Converse por WhatsApp */}
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardContent className="p-6 space-y-4">
                <MessageSquare className="h-12 w-12 mx-auto text-green-500" />
                <h3 className="text-xl font-semibold">Converse por WhatsApp</h3>
                <a 
                  href="https://wa.me/5546988212387" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors text-sm block"
                >
                  Iniciar Conversa
                </a>
              </CardContent>
            </Card>

            {/* Card 3: Nós ligamos para você */}
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardContent className="p-6 space-y-4">
                <PhoneCall className="h-12 w-12 mx-auto text-blue-500" />
                <h3 className="text-xl font-semibold">Nós ligamos para você</h3>
                <Button 
                  className="!rounded-button whitespace-nowrap text-sm px-6 py-2 bg-white text-gray-900 hover:bg-gray-200" 
                  onClick={() => setIsContactModalOpen(true)} // Abre o modal
                >
                  Solicitar Contato
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Rodapé com Ícones de Redes Sociais */}
      <footer className="bg-gray-900 border-t border-gray-800 py-6">
        <div className="container mx-auto px-6 flex flex-col items-center justify-center">
          <div className="flex space-x-6 mb-4">
            {/* Ícone do Instagram */}
            <div className="text-gray-500 hover:text-white transition-colors cursor-default">
              <i className="fab fa-instagram text-2xl"></i>
            </div>
            {/* Ícone do Facebook */}
            <div className="text-gray-500 hover:text-white transition-colors cursor-default">
              <i className="fab fa-facebook-f text-2xl"></i>
            </div>
            {/* Ícone do Twitter */}
            <div className="text-gray-500 hover:text-white transition-colors cursor-default">
              <i className="fab fa-twitter text-2xl"></i>
            </div>
            {/* Ícone do LinkedIn */}
            <div className="text-gray-500 hover:text-white transition-colors cursor-default">
              <i className="fab fa-linkedin-in text-2xl"></i>
            </div>
          </div>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} TipoAgenda. Todos os direitos reservados.</p>
        </div>
      </footer>
      
      {/* Contact Request Modal */}
      <ContactRequestModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

    </div>
  );
};

export default LandingPage;