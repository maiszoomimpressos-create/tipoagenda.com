import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { createButton } from '@/lib/dashboard-utils';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  category: string;
  status: 'Ativo' | 'Inativo';
}

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-500';
      case 'Inativo': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const fetchServices = useCallback(async () => {
    if (loadingPrimaryCompany || !session?.user) {
      return;
    }

    if (!primaryCompanyId) {
      setServices([]);
      setLoadingServices(false);
      return;
    }

    setLoadingServices(true);
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes, category, status')
      .eq('company_id', primaryCompanyId)
      .order('name', { ascending: true });

    if (error) {
      showError('Erro ao carregar serviços: ' + error.message);
      console.error('Error fetching services:', error);
      setServices([]);
    } else if (data) {
      setServices(data as Service[]);
    }
    setLoadingServices(false);
  }, [session, primaryCompanyId, loadingPrimaryCompany]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingPrimaryCompany || loadingServices) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando serviços...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para ver os serviços.</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para gerenciar serviços.
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
        {createButton(() => navigate('/novo-servico'), 'fas fa-plus', 'Adicionar Serviço')}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar serviço..."
            className="border-gray-300 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Filtros podem ser adicionados aqui futuramente */}
        {/* {createButton(() => {}, 'fas fa-filter', 'Filtros', 'outline')} */}
      </div>

      <div className="grid gap-4">
        {filteredServices.length === 0 ? (
          <p className="text-gray-600">Nenhum serviço encontrado. Adicione um novo serviço para começar!</p>
        ) : (
          filteredServices.map((service) => (
            <Card key={service.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-cut text-gray-600 text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-600">{service.category} • {service.duration_minutes} min</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-600">R$ {service.price.toFixed(2).replace('.', ',')}</p>
                    <Badge className={`${getStatusColor(service.status)} text-white text-xs`}>
                      {service.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ServicesPage;