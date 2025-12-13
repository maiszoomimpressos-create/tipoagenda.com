import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';

interface Company {
  id: string;
  name: string;
  razao_social: string;
  cnpj: string;
  ativo: boolean;
  created_at: string;
  user_id: string;
}

const CompanyManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all companies (RLS for Global Admin should allow this)
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, razao_social, cnpj, ativo, created_at, user_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data as Company[]);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      showError('Erro ao carregar empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleToggleActive = async (company: Company) => {
    setLoading(true);
    const newStatus = !company.ativo;
    try {
      const { error } = await supabase
        .from('companies')
        .update({ ativo: newStatus })
        .eq('id', company.id);

      if (error) throw error;

      showSuccess(`Empresa ${company.name} ${newStatus ? 'ativada' : 'desativada'} com sucesso!`);
      fetchCompanies(); // Refresh list
    } catch (error: any) {
      console.error('Error toggling company status:', error);
      showError('Erro ao atualizar status da empresa: ' + error.message);
    } finally {
      setLoading(false);
    }
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

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Building className="h-6 w-6 text-green-600" />
            Todas as Empresas Cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-700">Carregando empresas...</p>
          ) : companies.length === 0 ? (
            <p className="text-gray-600">Nenhuma empresa cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Fantasia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CNPJ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criada em</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{company.cnpj}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(company.ativo)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(company.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant={company.ativo ? 'destructive' : 'default'}
                          size="sm"
                          className={`!rounded-button whitespace-nowrap ${company.ativo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                          onClick={() => handleToggleActive(company)}
                          disabled={loading}
                        >
                          {company.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyManagementPage;