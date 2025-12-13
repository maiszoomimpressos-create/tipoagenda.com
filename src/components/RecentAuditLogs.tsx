import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, User, Building, FileText, DollarSign, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuditLog {
  id: string;
  logged_at: string;
  table_name: string;
  operation: string;
  user_id: string;
  new_data: any;
}

const getIconForTable = (tableName: string) => {
  switch (tableName) {
    case 'companies':
      return <Building className="h-4 w-4 text-green-600" />;
    case 'contracts':
      return <FileText className="h-4 w-4 text-purple-600" />;
    case 'subscription_plans':
      return <DollarSign className="h-4 w-4 text-yellow-600" />;
    case 'products':
      return <Package className="h-4 w-4 text-blue-600" />;
    case 'profiles':
    case 'type_user':
      return <User className="h-4 w-4 text-gray-600" />;
    default:
      return <History className="h-4 w-4 text-gray-600" />;
  }
};

const RecentAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch the 50 most recent logs from the audit_logs table
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, logged_at, table_name, operation, user_id, new_data')
        .order('logged_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data as AuditLog[]);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      showError('Erro ao carregar logs de auditoria: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return <p className="text-center text-gray-600 p-4">Carregando logs...</p>;
  }

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <History className="h-6 w-6 text-gray-600" />
          Atividade Recente do Sistema (Logs)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 pr-4">
            {logs.length === 0 ? (
              <p className="text-gray-600 text-sm">Nenhuma atividade registrada recentemente.</p>
            ) : (
              logs.map((log) => {
                const dateFormatted = format(parseISO(log.logged_at), 'dd/MM/yyyy HH:mm', { locale: ptBR });
                const recordId = log.new_data?.id || log.new_data?.user_id || log.new_data?.company_id || log.id;
                const operationColor = log.operation === 'UPDATE' ? 'text-blue-600' : log.operation === 'INSERT' ? 'text-green-600' : 'text-red-600';
                
                let description = `Registro ${recordId.substring(0, 8)}...`;
                if (log.table_name === 'companies' && log.new_data?.name) {
                    description = `Empresa: ${log.new_data.name}`;
                } else if (log.table_name === 'profiles' && log.new_data?.first_name) {
                    description = `Perfil: ${log.new_data.first_name} ${log.new_data.last_name}`;
                } else if (log.table_name === 'subscription_plans' && log.new_data?.name) {
                    description = `Plano: ${log.new_data.name}`;
                }

                return (
                  <div key={log.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      {getIconForTable(log.table_name)}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          <span className={`${operationColor} font-bold mr-1`}>{log.operation}</span> em {log.table_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{dateFormatted}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Por: {log.user_id.substring(0, 8)}...</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentAuditLogs;