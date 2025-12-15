import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { setTargetCompanyId, getTargetCompanyId } from '@/utils/storage';
import { useSession } from '@/components/SessionContextProvider';
import { useIsClient } from '@/hooks/useIsClient';
import CompanySelectionModal from '@/components/CompanySelectionModal';
import { useActivePlans } from '@/hooks/useActivePlans';
import { Check, Zap, Search, MapPin, Phone, MessageSquare, PhoneCall } from 'lucide-react'; // Importando ícones Lucide
import { Input } from '@/components/ui/input';

interface Company {
  id: string;
  name: string;
  segment_type: string | null; // Segment ID
  image_url: string | null;
  // Adicionando campos para simular dados de serviço na listagem
  min_price: number;
  avg_rating: number;
  city: string; // Adicionado para filtragem
  state: string; // Adicionado para filtragem
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { isClient, loadingClientCheck } = useIsClient();
  const { plans, loading: loadingPlans } = useActivePlans();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState(''); // Novo estado para localização
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

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

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar todas as empresas cadastradas que estão ativas
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          segment_type,
          image_url,
          city,
          state,
          services(price, duration_minutes)
        `)
        .eq('ativo', true)
        .order('name', { ascending: true });

      if (error) throw error;

      const processedCompanies: Company[] = companiesData.map(company => {
        const prices = company.services.map(s => s.price);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const avgRating = (Math.random() * (5.0 - 4.5) + 4.5).toFixed(1);

        return {
          id: company.id,
          name: company.name,
          segment_type: company.segment_type,
          image_url: company.image_url,
          min_price: minPrice,
          avg_rating: parseFloat(avgRating),
          city: company.city || '',
          state: company.state || '',
        };
      });

      setCompanies(processedCompanies);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      showError('Erro ao carregar empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Logic to open the selection modal if the user is a client and just logged in without a target company
  useEffect(() => {
    if (!sessionLoading && session && isClient && !loadingClientCheck) {
      const targetCompanyId = getTargetCompanyId();
      
      if (!targetCompanyId) {
        setIsSelectionModalOpen(true);
      }
    }
  }, [session, sessionLoading, isClient, loadingClientCheck]);


  const filteredCompanies = companies.filter(company => {
    const searchLower = searchTerm.toLowerCase();
    const locationLower = locationTerm.toLowerCase();

    const matchesSearch = company.name.toLowerCase().includes(searchLower);
    
    const matchesLocation = !locationLower || 
      company.city.toLowerCase().includes(locationLower) || 
      company.state.toLowerCase().includes(locationLower);

    return matchesSearch && matchesLocation;
  });

  const getImageUrl = (company: Company) => {
    if (company.image_url) {
      return company.image_url;
    }
    return `https://readdy.ai/api/search-image?query=professional%20${company.name.toLowerCase()}%20business%20front%20or%20logo%20in%20clean%20minimalist%20workspace&width=300&height=200&seq=${company.id}&orientation=landscape`;
  };

  const handleBookAppointment = (companyId: string) => {
    setTargetCompanyId(companyId);
    
    if (session && isClient) {
      navigate('/agendar');
    } else {
      navigate('/login');
    }
  };

  const handleProfessionalSignup = () => {
    navigate('/register-company');
  };
  
  // Determine the most expensive plan for visual highlight
  const highestPricedPlan = plans.reduce((max, plan) => (plan.price > max.price ? plan : max), plans[0] || { price: -1 });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(45, 45, 45, 0.6)), url('https://readdy.ai/api/search-image?query=modern%20professional%20services%20appointment%20booking%20platform%20with%20diverse%20people%20using%20smartphones%20and%20tablets%20in%20clean%20minimalist%20environment%20with%20soft%20lighting%20and%20contemporary%20design%20elements&width=1440&height=1024&seq=hero-landing&orientation=landscape')`
        }}
      >
        <div className="container mx-auto px-6 text-center text-white">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            Agende Seus <span className="text-yellow-400">Serviços Favoritos</span><br />
            Em Um Só Lugar
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-200">
            Conectamos você aos melhores profissionais da sua região. Beleza, saúde, fitness, consultoria e muito mais. 
            Reserve seu horário em segundos e tenha uma experiência excepcional.
          </p>

          {/* Search Bar */}
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
                  onClick={fetchCompanies} // Re-fetch companies to apply filters
                >
                  <Search className="h-5 w-5 mr-2" />
                  Buscar Serviços
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">15.000+</div>
              <div className="text-gray-200">Profissionais</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">50.000+</div>
              <div className="text-gray-200">Agendamentos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">4.9</div>
              <div className="text-gray-200">Avaliação Média</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">95%</div>
              <div className="text-gray-200">Satisfação</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (New) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Planos Para Profissionais</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Escolha o plano ideal para gerenciar seu negócio e crescer sem limites.
            </p>
          </div>

          {loadingPlans ? (
            <p className="text-center text-gray-600">Carregando planos...</p>
          ) : plans.length === 0 ? (
            <p className="text-center text-gray-600">Nenhum plano ativo disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => {
                // Verifica se este é o plano mais caro para destaque
                const isFeatured = plan.id === highestPricedPlan.id;
                const cardClasses = isFeatured 
                  ? 'border-4 border-yellow-600 shadow-2xl scale-105' 
                  : 'border-2 border-gray-200 hover:border-yellow-600 transition-all shadow-lg';
                
                const monthlyPrice = plan.duration_months > 1 ? (plan.price / plan.duration_months) : plan.price;

                return (
                  <Card key={plan.id} className={cardClasses}>
                    {isFeatured && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Zap className="h-3 w-3" /> MAIS POPULAR
                      </div>
                    )}
                    <CardHeader className="text-center pt-8">
                      <CardTitle className="text-3xl font-bold text-gray-900">{plan.name}</CardTitle>
                      <p className="text-5xl font-extrabold text-yellow-600 mt-4">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-base text-gray-500">
                        {plan.duration_months > 1 ? `Pagamento Único / ${plan.duration_months} meses` : '/ Mês'}
                      </p>
                      {plan.duration_months > 1 && (
                        <p className="text-sm text-gray-600 mt-1">
                          (R$ {monthlyPrice.toFixed(2).replace('.', ',')} por mês)
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-center text-gray-600">{plan.description}</p>
                      <ul className="space-y-3 text-sm text-gray-700 border-t pt-4">
                        {plan.features?.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="!rounded-button whitespace-nowrap w-full font-semibold py-2.5 text-base bg-yellow-600 hover:bg-yellow-700 text-black"
                        onClick={handleProfessionalSignup} // Redireciona para o cadastro de empresa
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
            {loading ? (
              <p className="text-gray-600 col-span-full text-center">Carregando empresas...</p>
            ) : filteredCompanies.length === 0 ? (
              <p className="text-gray-600 col-span-full text-center">Nenhuma empresa encontrada com os critérios de busca.</p>
            ) : (
              filteredCompanies.map((company) => (
                <Card key={company.id} className="border-gray-200 cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="relative mb-4">
                      <img
                        src={getImageUrl(company)}
                        alt={company.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-lg shadow">
                        <div className="flex items-center gap-1">
                          <i className="fas fa-star text-yellow-500 text-sm"></i>
                          <span className="text-sm font-semibold">{company.avg_rating}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{company.name}</h3>
                    <p className="text-yellow-600 font-semibold mb-4">
                      {company.min_price > 0 ? `A partir de R$ ${company.min_price.toFixed(2).replace('.', ',')}` : 'Preço sob consulta'}
                    </p>
                    <Button 
                      className="!rounded-button whitespace-nowrap w-full bg-yellow-600 hover:bg-yellow-700 text-black"
                      onClick={() => handleBookAppointment(company.id)}
                    >
                      <i className="fas fa-calendar-alt mr-2"></i>
                      Agendar Agora
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
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
                  variant="default" 
                  className="!rounded-button whitespace-nowrap text-sm px-6 py-2 bg-white text-gray-900 hover:bg-gray-200" 
                  onClick={() => showError('Funcionalidade de Retorno de Chamada em desenvolvimento.')}
                >
                  Solicitar Contato
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Company Selection Modal */}
      {session && isClient && !loadingClientCheck && (
        <CompanySelectionModal 
          isOpen={isSelectionModalOpen} 
          onClose={() => setIsSelectionModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default LandingPage;