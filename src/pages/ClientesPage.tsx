import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getStatusColor, createButton, mockData } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';

const ClientesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        {createButton(() => navigate('/novo-cliente'), 'fas fa-user-plus', 'Cadastrar Cliente')}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input placeholder="Buscar cliente..." className="border-gray-300 text-sm" />
        </div>
        {createButton(() => {}, 'fas fa-filter', 'Filtros', 'outline')}
      </div>

      <div className="grid gap-4">
        {mockData.clientes.map((cliente) => (
          <Card key={cliente.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gray-200 text-gray-700">
                      {cliente.nome.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
                    <p className="text-sm text-gray-600">{cliente.telefone}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{cliente.visitas} visitas</p>
                  <p className="text-sm text-yellow-600">{cliente.pontos} pontos</p>
                </div>
                <Badge className={`${getStatusColor(cliente.status)} text-xs`}>
                  {cliente.status.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClientesPage;