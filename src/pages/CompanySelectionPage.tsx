import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useSession } from '@/components/SessionContextProvider';
import UserDropdownMenu from '@/components/UserDropdownMenu'; // Reusing existing UserDropdownMenu

interface Company {
  id: string;
  name: string;
  segment_type: string | null; // Segment ID
  image_url: string | null;
  min_price: number;
  avg_rating: number;
  city: string; // Adicionado para filtragem
  state: string; // Adicionado para filtragem
}

const CompanySelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();

  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
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
        // Mock avg_rating for now, should come from DB
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

      // Filter by search terms
      const searchLower = searchTerm.toLowerCase();
      const locationLower = locationTerm.toLowerCase();

      const filtered = processedCompanies.filter(company => {
        const matchesSearch = company.name.toLowerCase().includes(searchLower);
        const matchesLocation = !locationLower ||
          company.city.toLowerCase().includes(locationLower) ||
          company.state.toLowerCase().includes(locationLower);
        return matchesSearch && matchesLocation;
      });

      setCompanies(filtered);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      showError('Erro ao carregar empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, locationTerm]); // Dependências atualizadas

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

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
                    className="pl-12 h-10 rounded-full border-gray-200 text-gray-800"
                  />
                </div>
                <Button
                  className="!rounded-button whitespace-nowrap h-10 font-semibold bg-yellow-600 hover:bg-yellow-700 text-black"
                  onClick={fetchCompanies}
                >
                  <Search className="h-5 w-5 mr-2" />
                  Buscar Empresas
                </Button>
              </div>
            </div>
          </div>

          {/* Grid de Empresas */}
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