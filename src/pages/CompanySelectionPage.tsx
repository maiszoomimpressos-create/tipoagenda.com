import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarDays, CheckCircle, Clock, Building2, Sparkles, Heart, Activity, GraduationCap, Briefcase, Home, Car, Dog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useSession } from '@/components/SessionContextProvider';
import UserDropdownMenu from '@/components/UserDropdownMenu'; // Reusing existing UserDropdownMenu

interface Company {
  id: string;
  name: string;
  segment_type: string | null; // Segment ID
  segment_name: string | null; // Nome do segmento
  image_url: string | null;
  min_price: number;
  avg_rating: number;
  city: string; // Adicionado para filtragem
  state: string; // Adicionado para filtragem
  services?: any[]; // Serviços para busca
}

const CompanySelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();

  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [segmentTypes, setSegmentTypes] = useState<{ id: string; name: string; area_de_atuacao: { name: string } | null }[]>([]);

  // Função para normalizar strings (remover acentos, espaços extras, etc.)
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  };

  // Função para mapear categoria visual para área de atuação (com variações)
  const getAreaNameForCategory = (categoryName: string | null): string[] => {
    if (!categoryName) return [];
    
    // Mapeamento entre categoria visual e possíveis nomes de área de atuação
    const categoryToAreaMap: { [key: string]: string[] } = {
      'Beleza & Estética': ['Beleza & Estética', 'Beleza e Estética'],
      'Saúde & Bem-estar': ['Saúde & Bem-Estar', 'Saúde & Bem-estar', 'Saúde e Bem-Estar', 'Saúde e Bem-estar'],
      'Fitness & Personal': ['Fitness & Personal', 'Fitness e Personal'],
      'Educação & Coaching': ['Educação & Coaching', 'Educação e Coaching'],
      'Consultoria & Negócios': ['Consultoria & Negócios', 'Consultoria e Negócios'],
      'Casa & Manutenção': ['Casa & Manutenção', 'Casa e Manutenção'],
      'Automotivo': ['Automotivo'],
      'Pet Care': ['Pet Care']
    };

    return categoryToAreaMap[categoryName] || [];
  };

  // Função para obter segment_type IDs baseado na área de atuação
  const getSegmentIdsForCategory = (categoryName: string | null, segments: { id: string; name: string; area_de_atuacao: { name: string } | null }[]): string[] => {
    if (!categoryName || !segments.length) return [];
    
    const possibleAreaNames = getAreaNameForCategory(categoryName);
    if (possibleAreaNames.length === 0) return [];

    // Filtrar segmentos que pertencem à área de atuação correspondente (comparação case-insensitive e sem acentos)
    return segments
      .filter(segment => {
        const segmentAreaName = segment.area_de_atuacao?.name;
        if (!segmentAreaName) return false;
        
        // Comparar normalizado
        const normalizedSegmentArea = normalizeString(segmentAreaName);
        return possibleAreaNames.some(areaName => 
          normalizeString(areaName) === normalizedSegmentArea
        );
      })
      .map(segment => segment.id);
  };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar segment_types com suas áreas de atuação se ainda não foram carregados
      let currentSegmentTypes = segmentTypes;
      if (currentSegmentTypes.length === 0) {
        const { data: segmentsData, error: segmentsError } = await supabase
          .from('segment_types')
          .select(`
            id, 
            name,
            area_de_atuacao(name)
          `)
          .order('name', { ascending: true });

        if (!segmentsError && segmentsData) {
          currentSegmentTypes = segmentsData as { id: string; name: string; area_de_atuacao: { name: string } | null }[];
          setSegmentTypes(currentSegmentTypes);
        }
      }

      // Obter IDs de segmentos para a categoria selecionada
      const segmentIds = selectedCategory && currentSegmentTypes.length > 0 
        ? getSegmentIdsForCategory(selectedCategory, currentSegmentTypes) 
        : [];

      // Construir query
      let query = supabase
        .from('companies')
        .select(`
          id,
          name,
          segment_type,
          image_url,
          city,
          state,
          services(price, duration_minutes, name)
        `)
        .eq('ativo', true);

      // Filtrar por segment_type se uma categoria estiver selecionada
      if (segmentIds.length > 0) {
        query = query.in('segment_type', segmentIds);
      }

      const { data: companiesData, error } = await query.order('name', { ascending: true });

      if (error) throw error;

      // Buscar todos os segment_types para fazer o mapeamento
      const { data: allSegmentsData } = await supabase
        .from('segment_types')
        .select('id, name');

      // Criar um mapa de segment_type ID -> nome
      const segmentMap = new Map<string, string>();
      if (allSegmentsData) {
        allSegmentsData.forEach(segment => {
          segmentMap.set(segment.id, segment.name);
        });
      }

      const processedCompanies: Company[] = companiesData.map(company => {
        const prices = company.services.map((s: any) => s.price);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        // Mock avg_rating for now, should come from DB
        const avgRating = (Math.random() * (5.0 - 4.5) + 4.5).toFixed(1);

        return {
          id: company.id,
          name: company.name,
          segment_type: company.segment_type,
          segment_name: company.segment_type ? segmentMap.get(company.segment_type) || null : null, // Nome do segmento
          image_url: company.image_url,
          min_price: minPrice,
          avg_rating: parseFloat(avgRating),
          city: company.city || '',
          state: company.state || '',
          services: company.services || [], // Manter serviços para busca futura
        };
      });

      // Filtrar por termo de busca (nome da empresa OU nome do segmento OU nome do serviço)
      // e por localização
      const searchLower = searchTerm ? searchTerm.toLowerCase().trim() : '';
      const locationLower = locationTerm ? locationTerm.toLowerCase().trim() : '';

      let filtered = processedCompanies;

      // Se houver termo de busca, verificar no nome da empresa, segmento e serviços
      if (searchLower) {
        filtered = processedCompanies.filter(company => {
          // Verificar no nome da empresa
          const matchesCompanyName = company.name.toLowerCase().includes(searchLower);
          
          // Verificar no nome do segmento
          const matchesSegmentName = company.segment_name && 
            company.segment_name.toLowerCase().includes(searchLower);
          
          // Verificar no nome dos serviços
          const matchesServiceName = company.services && company.services.some((service: any) => 
            service.name && service.name.toLowerCase().includes(searchLower)
          );
          
          return matchesCompanyName || matchesSegmentName || matchesServiceName;
        });
      }

      // Filtrar por localização (cidade ou estado)
      if (locationLower) {
        filtered = filtered.filter(company => {
          const cityMatch = company.city.toLowerCase().includes(locationLower);
          const stateMatch = company.state.toLowerCase().includes(locationLower);
          return cityMatch || stateMatch;
        });
      }

      setCompanies(filtered);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      showError('Erro ao carregar empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, locationTerm, selectedCategory, segmentTypes]); // Dependências atualizadas

  // Carregar empresas na montagem inicial e quando categoria mudar
  useEffect(() => {
    fetchCompanies();
  }, [selectedCategory]); // Quando categoria mudar

  // Carregar empresas na primeira renderização
  useEffect(() => {
    if (segmentTypes.length === 0) {
      fetchCompanies();
    }
  }, []); // Apenas na montagem inicial

  // Função para buscar manualmente (chamada pelo botão)
  const handleSearch = () => {
    fetchCompanies();
  };

  const getImageUrl = (company: Company) => {
    if (company.image_url) {
      return company.image_url;
    }
    return `https://readdy.ai/api/search-image?query=professional%20${company.name.toLowerCase()}%20business%20front%20or%20logo%20in%20clean%20minimalist%20workspace&width=300&height=200&seq=${company.id}&orientation=landscape`;
  };

  const handleCompanyClick = (companyId: string) => {
    // Implementar a lógica de redirecionamento para /agendamento/:idEmpresa na próxima tarefa
    navigate(`/agendar/${companyId}`);
  };

  const handleCategoryClick = (categoryName: string) => {
    // Se clicar na mesma categoria, deseleciona (mostra todas)
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryName);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Customizado para Seleção de Empresa */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link to="/meus-agendamentos" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
              <CalendarDays className="text-white h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">TipoAgenda</h1>
          </Link>

          {/* Menu do Usuário */}
          <div className="flex items-center gap-4">
            {session ? (
              <UserDropdownMenu session={session} />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="!rounded-button">
                    Login
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/login')}>
                    Login
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/register-professional')}>
                    Cadastro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Seção de Busca e Listagem de Empresas */}
      <section className="pt-24 pb-10 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Selecione uma Empresa para Agendar
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Encontre a empresa ideal para o seu próximo serviço.
            </p>
          </div>

          {/* Barra de Busca e Filtros */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Nome da empresa ou serviço"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="pl-12 h-10 rounded-full border-gray-200 text-gray-800"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Sua localização (Cidade/Estado)"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="pl-12 h-10 rounded-full border-gray-200 text-gray-800"
                  />
                </div>
                <Button
                  className="!rounded-button whitespace-nowrap h-10 font-semibold bg-yellow-600 hover:bg-yellow-700 text-black"
                  onClick={handleSearch}
                >
                  <Search className="h-5 w-5 mr-2" />
                  Buscar Empresas
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Como Funciona */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-xl text-gray-600">Agendar nunca foi tão simples e rápido</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {/* Passo 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="text-yellow-600">#1</span> Busque e Compare
              </h3>
              <p className="text-gray-600 text-lg">
                Encontre profissionais qualificados na sua região e compare preços e avaliações
              </p>
            </div>

            {/* Passo 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CalendarDays className="h-8 w-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="text-yellow-600">#2</span> Escolha o Horário
              </h3>
              <p className="text-gray-600 text-lg">
                Selecione o dia e horário que funciona melhor para você em tempo real
              </p>
            </div>

            {/* Passo 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                <span className="text-yellow-600">#3</span> Confirme e Relaxe
              </h3>
              <p className="text-gray-600 text-lg">
                Receba confirmação instantânea e lembretes automáticos do seu agendamento
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Explore Por Categoria */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Por Categoria</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Encontre exatamente o que precisa navegando pelas nossas categorias especializadas
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Categoria 1: Beleza & Estética */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Beleza & Estética' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Beleza & Estética')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Beleza & Estética' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <Sparkles className={`h-8 w-8 ${
                    selectedCategory === 'Beleza & Estética' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Beleza & Estética</h3>
              </CardContent>
            </Card>

            {/* Categoria 2: Saúde & Bem-estar */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Saúde & Bem-estar' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Saúde & Bem-estar')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Saúde & Bem-estar' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <Heart className={`h-8 w-8 ${
                    selectedCategory === 'Saúde & Bem-estar' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Saúde & Bem-estar</h3>
              </CardContent>
            </Card>

            {/* Categoria 3: Fitness & Personal */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Fitness & Personal' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Fitness & Personal')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Fitness & Personal' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <Activity className={`h-8 w-8 ${
                    selectedCategory === 'Fitness & Personal' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Fitness & Personal</h3>
              </CardContent>
            </Card>

            {/* Categoria 4: Educação & Coaching */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Educação & Coaching' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Educação & Coaching')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Educação & Coaching' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <GraduationCap className={`h-8 w-8 ${
                    selectedCategory === 'Educação & Coaching' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Educação & Coaching</h3>
              </CardContent>
            </Card>

            {/* Categoria 5: Consultoria & Negócios */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Consultoria & Negócios' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Consultoria & Negócios')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Consultoria & Negócios' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <Briefcase className={`h-8 w-8 ${
                    selectedCategory === 'Consultoria & Negócios' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Consultoria & Negócios</h3>
              </CardContent>
            </Card>

            {/* Categoria 6: Casa & Manutenção */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Casa & Manutenção' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Casa & Manutenção')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Casa & Manutenção' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <Home className={`h-8 w-8 ${
                    selectedCategory === 'Casa & Manutenção' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Casa & Manutenção</h3>
              </CardContent>
            </Card>

            {/* Categoria 7: Automotivo */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Automotivo' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Automotivo')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Automotivo' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <Car className={`h-8 w-8 ${
                    selectedCategory === 'Automotivo' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Automotivo</h3>
              </CardContent>
            </Card>

            {/* Categoria 8: Pet Care */}
            <Card 
              className={`border-2 transition-all cursor-pointer ${
                selectedCategory === 'Pet Care' 
                  ? 'border-yellow-600 bg-yellow-50' 
                  : 'border-gray-200 hover:border-yellow-600'
              }`}
              onClick={() => handleCategoryClick('Pet Care')}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedCategory === 'Pet Care' 
                    ? 'bg-yellow-400' 
                    : 'bg-gray-100'
                }`}>
                  <Dog className={`h-8 w-8 ${
                    selectedCategory === 'Pet Care' 
                      ? 'text-black' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Pet Care</h3>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Seção: Próximos Passos (3 cards) */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Próximos Passos</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Siga estes passos simples para agendar seu serviço
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Card 1: Selecione uma empresa */}
            <Card className="border-2 border-yellow-600 bg-yellow-50">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-black" />
                </div>
                <div className="text-2xl font-bold text-yellow-600 mb-2">1</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Selecione uma Empresa</h3>
                <p className="text-gray-600 text-sm">
                  Escolha uma das empresas abaixo para ver os serviços disponíveis
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Escolha serviço e horário */}
            <Card className="border-2 border-gray-200 hover:border-yellow-600 transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-gray-600" />
                </div>
                <div className="text-2xl font-bold text-gray-400 mb-2">2</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Escolha o Serviço e Horário</h3>
                <p className="text-gray-600 text-sm">
                  Selecione o serviço desejado e o melhor horário para você
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Confirme agendamento */}
            <Card className="border-2 border-gray-200 hover:border-yellow-600 transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-gray-600" />
                </div>
                <div className="text-2xl font-bold text-gray-400 mb-2">3</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirme seu Agendamento</h3>
                <p className="text-gray-600 text-sm">
                  Revise os detalhes e confirme. Você receberá lembretes automáticos!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Seção: Grid de Empresas */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <p className="text-gray-600 col-span-full text-center">Carregando empresas...</p>
            ) : companies.length === 0 ? (
              <p className="text-gray-600 col-span-full text-center">Nenhuma empresa encontrada com os critérios de busca.</p>
            ) : (
              companies.map((company) => (
                <Card
                  key={company.id}
                  className="border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleCompanyClick(company.id)}
                >
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
                    <div className="flex items-center text-gray-500 text-sm">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{company.city}, {company.state}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CompanySelectionPage;