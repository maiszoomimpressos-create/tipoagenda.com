import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useReportsData } from '@/hooks/useReportsData';
import { DateRangeKey } from '@/utils/date-utils';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from '@/components/SessionContextProvider';

// Helper component for KPI cards
interface KpiCardProps {
  title: string;
  value: number;
  comparison: number;
  isPositive: boolean;
  iconClass: string;
  colorClass: string;
  isCurrency?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, comparison, isPositive, iconClass, colorClass, isCurrency = false }) => {
  const formattedValue = isCurrency ? `R$ ${value.toFixed(2).replace('.', ',')}` : value.toLocaleString('pt-BR');
  const comparisonText = `${isPositive ? '+' : '-'}${comparison.toFixed(0)}% vs período anterior`;
  const comparisonColor = isPositive ? 'text-green-600' : 'text-red-600';
  
  // Adjust color class for icon/background based on input
  const iconBgClass = `bg-${colorClass}-100`;
  const iconColorClass = `text-${colorClass}-600`;

  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <div className="text-center">
          <div className={`w-12 h-12 ${iconBgClass} rounded-lg flex items-center justify-center mx-auto mb-3`}>
            <i className={`${iconClass} ${iconColorClass} text-xl`}></i>
          </div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
          <p className={`text-sm mt-1 ${comparisonColor}`}>{comparisonText}</p>
        </div>
      </CardContent>
    </Card>
  );
};


const RelatoriosPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('last_month');
  const { reportsData, loading, collaborators } = useReportsData(dateRangeKey);

  if (sessionLoading || loadingPrimaryCompany || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando relatórios...</p>
      </div>
    );
  }

  if (!session?.user || !primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para acessar relatórios.
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
      title: 'Faturamento', 
      data: reportsData.revenue, 
      icon: 'fas fa-chart-line', 
      color: 'blue', 
      isCurrency: true 
    },
    { 
      title: 'Ticket Médio', 
      data: reportsData.averageTicket, 
      icon: 'fas fa-receipt', 
      color: 'green', 
      isCurrency: true 
    },
    { 
      title: 'Clientes Atendidos', 
      data: reportsData.clientsServed, 
      icon: 'fas fa-users', 
      color: 'purple', 
      isCurrency: false 
    },
    { 
      title: 'Cancelamentos', 
      data: reportsData.cancellations, 
      icon: 'fas fa-times-circle', 
      color: 'red', 
      isCurrency: false 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <div className="flex gap-3">
          <Select onValueChange={(value) => setDateRangeKey(value as DateRangeKey)} value={dateRangeKey}>
            <SelectTrigger className="w-[180px] px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Últimos 30 dias</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="last_year">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
            <i className="fas fa-download mr-2"></i>
            Exportar
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.data.value}
            comparison={kpi.data.comparison}
            isPositive={kpi.data.isPositive}
            iconClass={kpi.icon}
            colorClass={kpi.color}
            isCurrency={kpi.isCurrency}
          />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance por Colaborador */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Performance por Colaborador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {collaborators.length === 0 ? (
                <p className="text-gray-600">Nenhum colaborador com agendamentos concluídos no período.</p>
              ) : (
                collaborators.map((colaborador) => (
                  <div key={colaborador.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                          {colaborador.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-gray-900">{colaborador.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{colaborador.appointments} atendimentos</p>
                      <p className="text-sm font-bold text-yellow-600">Comissão: R$ {colaborador.commission.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Serviços Mais Populares */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Serviços Mais Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportsData.popularServices.length === 0 ? (
                <p className="text-gray-600">Nenhum serviço concluído no período.</p>
              ) : (
                reportsData.popularServices.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">{item.service}</span>
                      <span className="text-sm text-gray-600">{item.quantity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{ width: `${item.percentual}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatoriosPage;