import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { setTargetCompanyId, getTargetCompanyId } from '@/utils/storage';
import { useSession } from '@/components/SessionContextProvider';
import { useIsClient } from '@/hooks/useIsClient';
import CompanySelectionModal from '@/components/CompanySelectionModal';
import { useActivePlans } from '@/hooks/useActivePlans'; // Importar novo hook
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input'; // Importação corrigida

interface Company {
  id: string;
  name: string;
  segment_type: string | null; // Segment ID
  image_url: string | null;
  // Adicionando campos para simular dados de serviço na listagem
  min_price: number;
  avg_rating: number;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { isClient, loadingClientCheck } = useIsClient();
  const { plans, loading: loadingPlans } = useActivePlans(); // Usar novo hook
  
  const [searchTerm, setSearchTerm] = useState('');
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
      
      // If the user is a client, is logged in, and there is NO target company ID set in storage, 
      // it means they logged in directly via /login or /signup and need to select a company.
      if (!targetCompanyId) {
        setIsSelectionModalOpen(true);
      }
      // Note: If targetCompanyId IS set, the SessionContextProvider already redirected them to /agendar.
    }
  }, [session, sessionLoading, isClient, loadingClientCheck]);


  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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
      // If already logged in as a client, redirect directly to booking page
      navigate('/agendar');
    } else {
      // If not logged in, redirect to login (SessionContextProvider handles redirection to /agendar after login)
      navigate('/login');
    }
  };

  const handleProfessionalSignup = () => {
    navigate('/register-company');
  };

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
                  <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <Input
                    type="text"
                    placeholder="Que serviço você procura?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
                  />
                </div>
                <div className="relative">
                  <i className="fas fa-map-marker-alt absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <Input
                    type="text"
                    placeholder="Sua localização"
                    className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
                  />
                </div>
                <Button className="!rounded-button whitespace-nowrap h-14 text-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-black">
                  <i className="fas fa-search mr-2"></i>
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
              {plans.map((plan) => (
                <Card key={plan.id} className="border-2 border-gray-200 hover:border-yellow-600 transition-all shadow-lg">
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-gray-900">{plan.name}</CardTitle>
                    <p className="text-5xl font-extrabold text-yellow-600 mt-4">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-base text-gray-500">/{plan.duration_months} {plan.duration_months > 1 ? 'meses' : 'mês'}</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-center text-gray-600">{plan.description}</p>
                    <ul className="space-y-3 text-sm text-gray-700 border-t pt-4">
                      {plan.features?.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
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
              ))}
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

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Pronto Para Começar?
          </h2>
          <p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
            Junte-se a milhares de usuários que já descobriram a forma mais fácil de agendar serviços
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="!rounded-button whitespace-nowrap text-lg px-8 py-4 bg-yellow-600 hover:bg-yellow-700 text-black" onClick={() => navigate('/signup')}>
              <i className="fas fa-user-plus mr-2"></i>
              Cadastrar-se Grátis
            </Button>
            <Button variant="outline" className="!rounded-button whitespace-nowrap text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-gray-900" onClick={handleProfessionalSignup}>
              <i className="fas fa-store mr-2"></i>
              Sou Profissional
            </Button>
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