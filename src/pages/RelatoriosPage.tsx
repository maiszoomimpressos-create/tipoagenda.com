import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockData } from '@/lib/dashboard-utils';

const RelatoriosPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <div className="flex gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Último mês</option>
            <option>Últimos 3 meses</option>
            <option>Último ano</option>
          </select>
          <Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
            <i className="fas fa-download mr-2"></i>
            Exportar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-chart-line text-blue-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Faturamento</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">R$ 45.280</p>
              <p className="text-sm text-green-600 mt-1">+12% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-receipt text-green-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">R$ 38,50</p>
              <p className="text-sm text-green-600 mt-1">+5% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-users text-purple-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Clientes Atendidos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">1.176</p>
              <p className="text-sm text-green-600 mt-1">+8% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-times-circle text-red-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Cancelamentos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
              <p className="text-sm text-red-600 mt-1">-3% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Performance por Barbeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.colaboradores.map((colaborador) => (
                <div key={colaborador.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                        {colaborador.nome.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-gray-900">{colaborador.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{colaborador.cortes} cortes</p>
                    <p className="text-sm text-yellow-600">{colaborador.comissao}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Serviços Mais Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { servico: 'Corte + Barba', quantidade: 245, percentual: 45 },
                { servico: 'Corte Tradicional', quantidade: 189, percentual: 35 },
                { servico: 'Barba + Bigode', quantidade: 87, percentual: 16 },
                { servico: 'Corte Moderno', quantidade: 23, percentual: 4 }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{item.servico}</span>
                    <span className="text-sm text-gray-600">{item.quantidade}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{ width: `${item.percentual}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatoriosPage;