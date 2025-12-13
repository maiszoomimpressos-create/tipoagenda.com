import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, CheckCircle, XCircle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Company {
  id: string;
  name: string;
  cnpj: string;
  ativo: boolean;
  user_id: string | null;
  segment_types: { name: string } | null;
  profiles: { first_name: string; last_name: string } | null;
}

const CompanyManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchCompanies = useCallback(async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('companies')
        .select(`
          id,
          name,
          cnpj,
          ativo,
          user_id,
          segment_types(name),
          profiles(first_name, last_name)
        `)
        .order('name', { ascending: true });

      if (filterStatus === 'active') {
        query = query.eq('ativo', true);
      } else if (filterStatus === 'inactive') {
        query = query.eq('ativo', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCompanies(data as Company[]);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      showError('Erro ao carregar empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [session, filterStatus]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleToggleStatus = async (companyId: string, currentStatus: boolean) => {
    if (!session?.user) {
      showError('Sessão expirada. Faça login novamente.');
      return;
    }

    const newStatus = !currentStatus;
    const action = newStatus ? 'ativar' : 'desativar';
    
    if (!window.confirm(`Tem certeza que deseja ${action} esta empresa?`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ ativo: newStatus })
        .eq('id', companyId);

      if (error) throw error;

      showSuccess(`Empresa ${newStatus ? 'ativada' : 'desativada'} com sucesso!`);
      fetchCompanies(); // Re-fetch data
    } catch (error: any) {
      console.error(`Error toggling company status:`, error);
      showError(`Erro ao ${action} empresa: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj.replace(/[^\d]/g, '').includes(searchTerm.replace(/[^\d]/g, ''))
  );

  const formatCnpj = (cnpj: string) => {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return `${cnpj.substring(0, 2)}.${cnpj.substring(2, 5)}.${cnpj.substring(5, 8)}/${cnpj.substring(8, 12)}-${cnpj.substring(12)}`;
  };

  const getStatusBadge = (ativo: boolean) => {
    return ativo 
      ? <Badge className="bg-green-500 text-white flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ativa</Badge>
      : <Badge className="bg-red-500 text-white flex items-center gap-1"><XCircle className="h-3 w-3" /> Inativa</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate('/admin-dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Empresas</h1>
      </div>

      <div className="max-w-full space-y-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Empresas Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou CNPJ..."
                  className="pl-10 border-gray-300 text-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant={filterStatus === 'all' ? 'default' : 'outline'} 
                  onClick={() => setFilterStatus('all')}
                  className="!rounded-button whitespace-nowrap"
                >
                  Todas
                </Button>
                <Button 
                  variant={filterStatus === 'active' ? 'default' : 'outline'} 
                  onClick={() => setFilterStatus('active')}
                  className="!rounded-button whitespace-nowrap"
                >
                  Ativas
                </Button>
                <Button 
                  variant={filterStatus === 'inactive' ? 'default' : 'outline'} 
                  onClick={() => setFilterStatus('inactive')}
                  className="!rounded-button whitespace-nowrap"
                >
                  Inativas
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNPJ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proprietário</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Carregando...</td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Nenhuma empresa encontrada.</td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => {
                      const ownerName = company.profiles 
                        ? `${company.profiles.first_name} ${company.profiles.last_name}` 
                        : 'N/A';
                      const segmentName = company.segment_types?.name || 'Não Definido';

                      return (
                        <tr key={company.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-500" />
                                {company.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCnpj(company.cnpj)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {ownerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {segmentName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {getStatusBadge(company.ativo)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id={`status-switch-${company.id}`}
                                        checked={company.ativo}
                                        onCheckedChange={() => handleToggleStatus(company.id, company.ativo)}
                                        disabled={loading}
                                    />
                                    <Label htmlFor={`status-switch-${company.id}`} className="text-xs text-gray-600">
                                        {company.ativo ? 'Ativa' : 'Inativa'}
                                    </Label>
                                </div>
                                {/* Botão de Detalhes (futura implementação) */}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="!rounded-button whitespace-nowrap"
                                    onClick={() => showError('Funcionalidade de detalhes da empresa em desenvolvimento.')}
                                >
                                    Detalhes
                                </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyManagementPage;