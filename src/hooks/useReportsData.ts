import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { getDateRange, getPreviousDateRange, DateRangeKey, DateRange } from '@/utils/date-utils';
import { format } from 'date-fns';

interface ReportMetric {
  value: number;
  comparison: number; // Percentage change vs previous period
  isPositive: boolean;
}

interface CollaboratorPerformance {
  id: string;
  name: string;
  appointments: number;
  revenue: number;
  commission: number;
}

interface PopularService {
  service: string;
  quantity: number;
  percentual: number;
}

interface ReportsData {
  revenue: ReportMetric;
  averageTicket: ReportMetric;
  clientsServed: ReportMetric;
  cancellations: ReportMetric;
  collaboratorPerformance: CollaboratorPerformance[];
  popularServices: PopularService[];
}

const initialReportMetric: ReportMetric = { value: 0, comparison: 0, isPositive: true };

const initialReportsData: ReportsData = {
  revenue: initialReportMetric,
  averageTicket: initialReportMetric,
  clientsServed: initialReportMetric,
  cancellations: initialReportMetric,
  collaboratorPerformance: [],
  popularServices: [],
};

// Helper to calculate comparison percentage
const calculateComparison = (currentValue: number, previousValue: number, isInverse: boolean = false): ReportMetric => {
  if (previousValue === 0) {
    return {
      value: currentValue,
      comparison: currentValue > 0 ? 100 : 0,
      isPositive: currentValue >= 0,
    };
  }
  const change = ((currentValue - previousValue) / previousValue) * 100;
  
  let isPositive = change >= 0;
  if (isInverse) {
    isPositive = change <= 0; // For cancellations, negative change (decrease) is positive
  }

  return {
    value: currentValue,
    comparison: Math.abs(change),
    isPositive: isInverse ? !isPositive : isPositive, // Flip positive logic for inverse metrics
  };
};

// Main function to fetch and calculate metrics for a given date range
async function fetchMetrics(companyId: string, range: DateRange) {
  const { startDateDb, endDateDb } = range;

  // 1. Fetch all relevant appointments (completed and cancelled)
  const { data: appointmentsData, error: appError } = await supabase
    .from('appointments')
    .select('id, client_id, collaborator_id, total_price, status, total_duration_minutes')
    .eq('company_id', companyId)
    .gte('appointment_date', startDateDb)
    .lte('appointment_date', endDateDb);

  if (appError) throw appError;

  // 2. Fetch all cash movements (revenue)
  const { data: cashMovementsData, error: cmError } = await supabase
    .from('cash_movements')
    .select('total_amount, transaction_type')
    .eq('company_id', companyId)
    .eq('transaction_type', 'recebimento')
    .gte('transaction_date', startDateDb)
    .lte('transaction_date', endDateDb);

  if (cmError) throw cmError;

  // 3. Fetch appointment services for popular services calculation
  const completedAppointmentIds = appointmentsData.filter(a => a.status === 'concluido').map(a => a.id);
  
  let serviceCounts: { [serviceId: string]: number } = {};
  let serviceDetails: { [serviceId: string]: { name: string } } = {};

  if (completedAppointmentIds.length > 0) {
    const { data: appServicesData, error: asError } = await supabase
      .from('appointment_services')
      .select(`service_id, services(name)`)
      .in('appointment_id', completedAppointmentIds);

    if (asError) throw asError;

    appServicesData.forEach(as => {
      const serviceId = as.service_id;
      serviceCounts[serviceId] = (serviceCounts[serviceId] || 0) + 1;
      if (as.services) {
        serviceDetails[serviceId] = as.services as { name: string };
      }
    });
  }

  // --- Calculations ---

  // Revenue
  const totalRevenue = cashMovementsData.reduce((sum, cm) => sum + cm.total_amount, 0);

  // Completed Appointments
  const completedAppointments = appointmentsData.filter(a => a.status === 'concluido');
  const completedAppointmentsCount = completedAppointments.length;

  // Average Ticket
  const averageTicket = completedAppointmentsCount > 0 ? totalRevenue / completedAppointmentsCount : 0;

  // Clients Served (Unique client IDs in completed appointments)
  const uniqueClientsServed = new Set(completedAppointments.map(a => a.client_id)).size;

  // Cancellations
  const cancellationsCount = appointmentsData.filter(a => a.status === 'cancelado').length;

  // Collaborator Performance (Appointments Count and Revenue)
  const collabPerformanceMap = new Map<string, { appointments: number, revenue: number }>();
  
  completedAppointments.forEach(app => {
    const collabId = app.collaborator_id;
    const current = collabPerformanceMap.get(collabId) || { appointments: 0, revenue: 0 };
    current.appointments += 1;
    current.revenue += app.total_price; // Use total_price from appointment for performance metric
    collabPerformanceMap.set(collabId, current);
  });

  return {
    totalRevenue,
    completedAppointmentsCount,
    averageTicket,
    uniqueClientsServed,
    cancellationsCount,
    collabPerformanceMap,
    serviceCounts,
    serviceDetails,
  };
}


export function useReportsData(dateRangeKey: DateRangeKey = 'last_month') {
  const { session } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [reportsData, setReportsData] = useState<ReportsData>(initialReportsData);
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState<CollaboratorPerformance[]>([]);

  const fetchReports = useCallback(async () => {
    if (!primaryCompanyId || !session?.user) {
      setReportsData(initialReportsData);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const currentRange = getDateRange(dateRangeKey);
      const previousRange = getPreviousDateRange(currentRange);

      // Fetch data for current period
      const currentMetrics = await fetchMetrics(primaryCompanyId, currentRange);
      
      // Fetch data for previous period
      const previousMetrics = await fetchMetrics(primaryCompanyId, previousRange);

      // --- KPI Calculations ---
      
      const revenue = calculateComparison(currentMetrics.totalRevenue, previousMetrics.totalRevenue);
      const averageTicket = calculateComparison(currentMetrics.averageTicket, previousMetrics.averageTicket, currentMetrics.averageTicket < previousMetrics.averageTicket);
      const clientsServed = calculateComparison(currentMetrics.uniqueClientsServed, previousMetrics.uniqueClientsServed);
      
      // Cancellations comparison is inverse (lower is better, so positive change means fewer cancellations)
      const cancellations = calculateComparison(currentMetrics.cancellationsCount, previousMetrics.cancellationsCount, true);

      // --- Collaborator Performance ---
      
      // Fetch collaborator names and commission rates
      const { data: collabNames, error: collabNamesError } = await supabase
        .from('collaborators')
        .select('id, first_name, last_name, commission_percentage')
        .eq('company_id', primaryCompanyId);

      if (collabNamesError) throw collabNamesError;

      const collaboratorPerformance: CollaboratorPerformance[] = collabNames.map(collab => {
        const metrics = currentMetrics.collabPerformanceMap.get(collab.id) || { appointments: 0, revenue: 0 };
        const commission = metrics.revenue * (collab.commission_percentage / 100);
        
        return {
          id: collab.id,
          name: `${collab.first_name} ${collab.last_name}`,
          appointments: metrics.appointments,
          revenue: metrics.revenue,
          commission: commission,
        };
      }).sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

      setCollaborators(collaboratorPerformance);

      // --- Popular Services ---
      const totalServicesSold = Object.values(currentMetrics.serviceCounts).reduce((sum, count) => sum + count, 0);
      
      const popularServices: PopularService[] = Object.entries(currentMetrics.serviceCounts)
        .map(([serviceId, quantity]) => {
          const name = currentMetrics.serviceDetails[serviceId]?.name || 'Serviço Desconhecido';
          const percentual = totalServicesSold > 0 ? (quantity / totalServicesSold) * 100 : 0;
          return {
            service: name,
            quantity,
            percentual: Math.round(percentual),
          };
        })
        .sort((a, b) => b.quantity - a.quantity);

      setReportsData({
        revenue,
        averageTicket,
        clientsServed,
        cancellations,
        collaboratorPerformance,
        popularServices,
      });

    } catch (error: any) {
      console.error('Error fetching reports:', error);
      showError('Erro ao gerar relatórios: ' + error.message);
      setReportsData(initialReportsData);
    } finally {
      setLoading(false);
    }
  }, [primaryCompanyId, session?.user, dateRangeKey]);

  useEffect(() => {
    if (!loadingPrimaryCompany) {
      fetchReports();
    }
  }, [loadingPrimaryCompany, fetchReports]);

  return { reportsData, loading, collaborators, fetchReports };
}