import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusColor, createButton } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'; // Reintroduzindo imports
import { ptBR } from 'date-fns/locale';
// Removido import de Calendar (conforme sua instrução)

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  total_price: number;
  status: string;
  clients: { name: string } | null;
  collaborators: { first_name: string; last_name: string } | null;
  appointment_services: { services: { name: string } | null }[];
}

interface CollaboratorFilter {
  id: string;
  first_name: string;
  last_name: string;
}

const AgendamentosPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [selectedTab, setSelectedTab] = useState('dia');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Data de referência (hoje por padrão)
  const [collaboratorsList, setCollaboratorsList] = useState<CollaboratorFilter[]>([]);
  const [selectedCollaboratorFilter, setSelectedCollaboratorFilter] = useState('all');

  const fetchAppointments = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }

    setLoadingAppointments(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          total_price,
          status,
          clients(name),
          collaborators(first_name, last_name),
          appointment_services(
            services(name)
          )
        `)
        .eq('company_id', primaryCompanyId)
        .order('appointment_date', { ascending: true }) // Order by date first
        .order('appointment_time', { ascending: true });

      // Filter by date range based on selectedTab and selectedDate
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (selectedTab === 'dia') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else if (selectedTab === 'semana') {
        startDate = startOfWeek(selectedDate, { locale: ptBR });
        endDate = endOfWeek(selectedDate, { locale: ptBR });
      } else if (selectedTab === 'mes') {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      }

      if (startDate && endDate) {
        query = query.gte('appointment_date', format(startDate, 'yyyy-MM-dd'));
        query = query.lte('appointment_date', format(endDate, 'yyyy-MM-dd'));
      }

      // Filter by collaborator
      if (selectedCollaboratorFilter !== 'all') {
        query = query.eq('collaborator_id', selectedCollaboratorFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setAppointments(data as Appointment[]);
    } catch (error: any) {
      console.error('Erro ao carregar agendamentos:', error);
      showError('Erro ao carregar agendamentos: ' + error.message);
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId, selectedTab, selectedDate, selectedCollaboratorFilter]);

  const fetchCollaborators = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !primaryCompanyId) {
      return;
    }
    const { data, error } = await supabase
      .from('collaborators')
      .select('id, first_name, last_name')
      .eq('company_id', primaryCompanyId)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Erro ao carregar colaboradores para filtro:', error);
    } else if (data) {
      setCollaboratorsList(data);
    }
  }, [sessionLoading, loadingPrimaryCompany, primaryCompanyId]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  if (sessionLoading || loadingPrimaryCompany || loadingAppointments) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando agendamentos...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para ver os agendamentos.</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para gerenciar agendamentos.
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
        <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
        {createButton(() => navigate('/novo-agendamento'), 'fas fa-plus', 'Novo Agendamento')}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Tabs defaultValue="dia" className="w-auto" onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          value={selectedCollaboratorFilter}
          onChange={(e) => setSelectedCollaboratorFilter(e.target.value)}
        >
          <option value="all">Todos os Colaboradores</option>
          {collaboratorsList.map(col => (
            <option key={col.id} value={col.id}>{col.first_name} {col.last_name}</option>
          ))}
        </select>
        {/* O calendário foi removido conforme sua instrução. A data de referência para os filtros será sempre a data atual. */}
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <p className="text-gray-600">Nenhum agendamento encontrado para {selectedTab === 'dia' ? 'o dia selecionado' : selectedTab === 'semana' ? 'a semana selecionada' : 'o mês selecionado'}.</p>
        ) : (
          appointments.map((agendamento) => {
            const clientName = agendamento.clients?.name || 'Cliente Desconhecido';
            const collaboratorName = agendamento.collaborators ? `${agendamento.collaborators.first_name} ${agendamento.collaborators.last_name}` : 'Colaborador Desconhecido';
            const serviceNames = agendamento.appointment_services
              .map(as => as.services?.name)
              .filter(Boolean)
              .join(' + ');

            return (
              <Card key={agendamento.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{clientName}</h3>
                        <p className="text-sm text-gray-600">{serviceNames || 'Serviço(s) Desconhecido(s)'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{agendamento.appointment_time}</p>
                      <p className="text-sm text-gray-600">{collaboratorName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">R$ {agendamento.total_price.toFixed(2).replace('.', ',')}</p>
                      <Badge className={`${getStatusColor(agendamento.status)} text-white text-xs`}>
                        {agendamento.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AgendamentosPage;