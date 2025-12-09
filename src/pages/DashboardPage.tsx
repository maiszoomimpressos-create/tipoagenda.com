import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStatusColor, createButton, createCard } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KpiData {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: string;
}

interface AppointmentData {
  id: string;
  client_name: string;
  service_names: string;
  appointment_time: string;
  total_price: number;
  status: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<AppointmentData[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }

    setLoadingDashboard(true);
    try {
      const today = new Date();
      const startOfCurrentMonth = format(startOfMonth(today), 'yyyy-MM-dd');
      const endOfCurrentMonth = format(endOfMonth(today), 'yyyy-MM-dd');
      const startOfToday = format(startOfDay(today), 'yyyy-MM-dd');
      const endOfToday = format(endOfDay(today), 'yyyy-MM-dd');

      // --- Faturamento do Mês ---
      const { data: revenueData, error: revenueError } = await supabase
        .from('appointments')
        .select('total_price')
        .eq('company_id', primaryCompanyId)
        .eq('status', 'concluido')
        .gte('appointment_date', startOfCurrentMonth)
        .lte('appointment_date', endOfCurrentMonth);

      if (revenueError) throw revenueError;
      const monthlyRevenue = revenueData.reduce((sum, app) => sum + (app.total_price || 0), 0);
      // Placeholder for change percentage (requires previous month's data)
      const revenueChange = '+0%'; // Simplified for now

      // --- Agendamentos Hoje ---
      const { count: appointmentsTodayCount, error: appointmentsTodayError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact' })
        .eq('company_id', primaryCompanyId)
        .eq('appointment_date', startOfToday)
        .neq('status', 'cancelado');

      if (appointmentsTodayError) throw appointmentsTodayError;
      // Placeholder for change (requires previous day's data)
      const appointmentsTodayChange = '+0'; // Simplified for now

      // --- Colaborador Mais Ativo (simplificado para o mês atual) ---
      const { data: activeCollabData, error: activeCollabError } = await supabase
        .from('appointments')
        .select(`
          collaborators(id, first_name, last_name)
        `)
        .eq('company_id', primaryCompanyId)
        .gte('appointment_date', startOfCurrentMonth)
        .lte('appointment_date', endOfCurrentMonth)
        .neq('status', 'cancelado');

      if (activeCollabError) throw activeCollabError;

      const collaboratorCounts: { [key: string]: { name: string; count: number } } = {};
      activeCollabData.forEach(app => {
        if (app.collaborators) {
          const collabId = app.collaborators.id;
          const collabName = `${app.collaborators.first_name} ${app.collaborators.last_name}`;
          if (!collaboratorCounts[collabId]) {
            collaboratorCounts[collabId] = { name: collabName, count: 0 };
          }
          collaboratorCounts[collabId].count++;
        }
      });

      let mostActiveCollabName = 'N/A';
      let mostActiveCollabCount = 0;
      for (const id in collaboratorCounts) {
        if (collaboratorCounts[id].count > mostActiveCollabCount) {
          mostActiveCollabCount = collaboratorCounts[id].count;
          mostActiveCollabName = collaboratorCounts[id].name;
        }
      }

      setKpis([
        { title: 'Faturamento do Mês', value: `R$ ${monthlyRevenue.toFixed(2).replace('.', ',')}`, change: revenueChange, icon: 'fas fa-money-bill-wave', color: 'yellow' },
        { title: 'Agendamentos Hoje', value: appointmentsTodayCount?.toString() || '0', change: appointmentsTodayChange, icon: 'fas fa-calendar-check', color: 'yellow' },
        { title: 'Colaborador Mais Ativo', value: mostActiveCollabName, change: `${mostActiveCollabCount} agend.`, icon: 'fas fa-crown', color: 'yellow' },
        // REMOVIDO: { title: 'Estoque Crítico', value: `${criticalStockCount} itens`, change: 'Atenção', icon: 'fas fa-exclamation-triangle', color: 'red' }
      ]);

      // --- Agendamentos Recentes (Hoje) ---
      const { data: recentAppointmentsData, error: recentAppointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          total_price,
          status,
          clients(name),
          appointment_services(services(name))
        `)
        .eq('company_id', primaryCompanyId)
        .eq('appointment_date', startOfToday)
        .neq('status', 'cancelado')
        .order('appointment_time', { ascending: true })
        .limit(4);

      if (recentAppointmentsError) throw recentAppointmentsError;

      const formattedRecentAppointments: AppointmentData[] = recentAppointmentsData.map(app => ({
        id: app.id,
        client_name: app.clients?.name || 'Cliente Desconhecido',
        service_names: app.appointment_services.map((as: any) => as.services?.name).filter(Boolean).join(' + ') || 'Serviço(s) Desconhecido(s)',
        appointment_time: app.appointment_time.substring(0, 5),
        total_price: app.total_price || 0,
        status: app.status,
      }));
      setRecentAppointments(formattedRecentAppointments);

    } catch (error: any) {
      console.error('Erro ao carregar dados do dashboard:', error);
      showError('Erro ao carregar dados do dashboard: ' + error.message);
    } finally {
      setLoadingDashboard(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (sessionLoading || loadingPrimaryCompany || loadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando dashboard...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para ver o dashboard.</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para ver o dashboard.
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          {createButton(() => navigate('/novo-agendamento'), 'fas fa-plus', 'Novo Agendamento')}
          {createButton(() => navigate('/novo-cliente'), 'fas fa-user-plus', 'Novo Cliente')}
          {createButton(() => navigate('/fechar-caixa'), 'fas fa-cash-register', 'Fechar Caixa')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Alterado para 3 colunas */}
        {kpis.map((kpi, index) =>
          createCard(kpi.title, kpi.value, kpi.change, kpi.icon, kpi.color)
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
                {recentAppointments.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">Nenhum agendamento para hoje.</p>
                ) : (
                  recentAppointments.map((agendamento) => (
                    <div key={agendamento.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{agendamento.client_name}</p>
                          <p className="text-sm text-gray-600">{agendamento.appointment_time} - {agendamento.service_names}</p>
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