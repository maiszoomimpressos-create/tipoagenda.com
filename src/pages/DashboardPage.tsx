import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStatusColor, createButton, createCard, mockData } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          {createButton(() => navigate('/novo-agendamento'), 'fas fa-plus', 'Novo Agendamento')}
          {createButton(() => navigate('/novo-cliente'), 'fas fa-user-plus', 'Novo Cliente')}
          {createButton(() => navigate('/fechar-caixa'), 'fas fa-cash-register', 'Fechar Caixa')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockData.kpis.map((kpi, index) =>
          createCard(kpi.title, kpi.value, kpi.change, kpi.icon)
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-gray-900">Faturamento Mensal</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-line text-4xl text-yellow-600 mb-4"></i>
                <p className="text-gray-600">Gráfico de Performance</p>
                <p className="text-sm text-gray-500 mt-2">Crescimento de 12% este mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-gray-900">Agendamentos Hoje</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {mockData.agendamentos.slice(0, 4).map((agendamento) => (
                  <div key={agendamento.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{agendamento.cliente}</p>
                        <p className="text-sm text-gray-600">{agendamento.horario} - {agendamento.servico}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-yellow-600">{agendamento.valor}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;