import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStatusColor, createButton, createCard } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { useSession } from '@/components/SessionContextProvider';
import { showError } from '@/utils/toast';
import MonthlyRevenueChart from '@/components/MonthlyRevenueChart';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const { data, loading } = useDashboardData();

  if (sessionLoading || loadingPrimaryCompany || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando Dashboard...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para ver o Dashboard.</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para acessar o Dashboard.
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

  const kpis = [
    { 
      title: 'Faturamento do Mês', 
      value: `R$ ${data.revenue.toFixed(2).replace('.', ',')}`, 
      change: `${data.revenueChange >= 0 ? '+' : '-'}${data.revenueChange.toFixed(0)}%`, 
      icon: 'fas fa-money-bill-wave', 
      color: data.revenueChange >= 0 ? 'green' : 'red' 
    },
    { 
      title: 'Agendamentos Hoje', 
      value: data.appointmentsTodayCount.toString(), 
      change: `+${data.appointmentsTodayChange} vs ontem`, 
      icon: 'fas fa-calendar-check', 
      color: 'blue' 
    },
    { 
      title: 'Colaborador Mais Ativo', 
      value: data.mostActiveCollaborator?.name || 'N/A', 
      change: `${data.mostActiveCollaborator?.count || 0} atendimentos`, 
      icon: 'fas fa-crown', 
      color: 'yellow' 
    },
    { 
      title: 'Estoque Crítico', 
      value: `${data.criticalStockCount} itens`, 
      change: data.criticalStockCount > 0 ? 'Atenção' : 'OK', 
      icon: 'fas fa-exclamation-triangle', 
      color: data.criticalStockCount > 0 ? 'red' : 'green' 
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          {createButton(() => navigate(`/novo-agendamento/${primaryCompanyId}`), 'fas fa-plus', 'Novo Agendamento')}
          {createButton(() => navigate('/novo-cliente'), 'fas fa-user-plus', 'Novo Cliente')}
          {createButton(() => navigate('/fechar-caixa'), 'fas fa-cash-register', 'Fechar Caixa')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) =>
          createCard(kpi.title, kpi.value, kpi.change, kpi.icon, kpi.color)
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-gray-900">Faturamento Mensal</CardTitle></CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={data.monthlyRevenueData} />
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-gray-900">Agendamentos Hoje</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {data.appointmentsToday.length === 0 ? (
                  <p className="text-gray-600 text-center p-4">Nenhum agendamento para hoje.</p>
                ) : (
                  data.appointmentsToday.map((agendamento) => (
                    <div key={agendamento.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{agendamento.client_display_name}</p>
                          <p className="text-sm text-gray-600">{agendamento.time_range} - {agendamento.service_names}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-yellow-600">R$ {agendamento.total_price.toFixed(2).replace('.', ',')}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;