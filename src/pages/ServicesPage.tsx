import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { createButton } from '@/lib/dashboard-utils';

const mockServices = [
  { id: 1, name: 'Corte Tradicional', price: 'R$ 30,00', duration: '30 min', category: 'Cabelo', status: 'Ativo' },
  { id: 2, name: 'Corte + Barba', price: 'R$ 45,00', duration: '45 min', category: 'Cabelo e Barba', status: 'Ativo' },
  { id: 3, name: 'Barba Completa', price: 'R$ 25,00', duration: '20 min', category: 'Barba', status: 'Ativo' },
  { id: 4, name: 'Coloração Masculina', price: 'R$ 80,00', duration: '60 min', category: 'Cabelo', status: 'Inativo' },
  { id: 5, name: 'Hidratação Capilar', price: 'R$ 50,00', duration: '30 min', category: 'Cabelo', status: 'Ativo' },
];

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'bg-green-500';
      case 'Inativo': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
        {createButton(() => navigate('/novo-servico'), 'fas fa-plus', 'Adicionar Serviço')}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input placeholder="Buscar serviço..." className="border-gray-300 text-sm" />
        </div>
        {createButton(() => {}, 'fas fa-filter', 'Filtros', 'outline')}
      </div>

      <div className="grid gap-4">
        {mockServices.map((service) => (
          <Card key={service.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-cut text-gray-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600">{service.category} • {service.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-yellow-600">{service.price}</p>
                  <Badge className={`${getStatusColor(service.status)} text-white text-xs`}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServicesPage;