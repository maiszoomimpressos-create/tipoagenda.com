import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createButton } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Edit, Trash2, Clock } from 'lucide-react'; // Importar ícones
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Importar componentes de diálogo

interface Collaborator {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  hire_date: string;
  role_type_id: number;
  commission_percentage: number;
  status: string;
  avatar_url: string | null;
  role_description?: string; // Adicionar para exibir a descrição da função
}

const ColaboradoresPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<string | null>(null);

  const fetchCollaborators = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany) {
      return;
    }

    if (!session?.user) {
      setCollaborators([]);
      setLoadingCollaborators(false);
      return;
    }

    if (!primaryCompanyId) {
      setCollaborators([]);
      setLoadingCollaborators(false);
      return;
    }

    setLoadingCollaborators(true);
    const { data, error } = await supabase
      .from('collaborators')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone_number,
        hire_date,
        role_type_id,
        commission_percentage,
        status,
        avatar_url,
        role_types(description)
      `)
      .eq('company_id', primaryCompanyId)
      .order('first_name', { ascending: true });

    if (error) {
      showError('Erro ao carregar colaboradores: ' + error.message);
      console.error('Error fetching collaborators:', error);
      setCollaborators([]);
    } else if (data) {
      const formattedData: Collaborator[] = data.map(col => ({
        ...col,
        role_description: (col.role_types as { description: string })?.description || 'N/A',
      }));
      setCollaborators(formattedData);
    }
    setLoadingCollaborators(false);
  }, [session, primaryCompanyId, sessionLoading, loadingPrimaryCompany]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleDeleteClick = (collaboratorId: string) => {
    setCollaboratorToDelete(collaboratorId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (collaboratorToDelete && session?.user && primaryCompanyId) {
      setLoadingCollaborators(true);
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorToDelete)
        .eq('company_id', primaryCompanyId);

      if (error) {
        showError('Erro ao excluir colaborador: ' + error.message);
        console.error('Error deleting collaborator:', error);
      } else {
        showSuccess('Colaborador excluído com sucesso!');
        fetchCollaborators(); // Refresh the list
      }
      setLoadingCollaborators(false);
      setIsDeleteDialogOpen(false);
      setCollaboratorToDelete(null);
    }
  };

  if (sessionLoading || loadingPrimaryCompany || loadingCollaborators) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando colaboradores...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para ver os colaboradores.</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para gerenciar colaboradores.
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
        <h1 className="text-3xl font-bold text-gray-900">Colaboradores</h1>
        {createButton(() => navigate('/colaboradores/new'), 'fas fa-user-plus', 'Adicionar Colaborador')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collaborators.length === 0 ? (
          <p className="text-gray-600">Nenhum colaborador encontrado para sua empresa. Adicione um novo colaborador para começar!</p>
        ) : (
          collaborators.map((colaborador) => (
            <Card key={colaborador.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="text-center">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={colaborador.avatar_url || `https://readdy.ai/api/search-image?query=professional%20${colaborador.role_description?.toLowerCase() || 'person'}%20portrait%20with%20modern%20styling%20tools%20in%20clean%20environment%20with%20professional%20lighting%20and%20neutral%20background&width=80&height=80&seq=${colaborador.id}&orientation=squarish`} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xl">
                      {colaborador.first_name.split(' ').map(n => n[0]).join('')}{colaborador.last_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-bold text-gray-900 text-lg">{colaborador.first_name} {colaborador.last_name}</h3>
                  <p className="text-gray-600 mb-3">{colaborador.role_description}</p>
                  <div className="space-y-2">
                    {/* Email */}
                    <div className="flex flex-wrap justify-between items-baseline">
                      <span className="text-sm text-gray-600 mr-2">E-mail:</span>
                      <span className="font-semibold text-gray-900 text-right flex-1 break-words min-w-0">{colaborador.email}</span>
                    </div>
                    {/* Telefone */}
                    <div className="flex flex-wrap justify-between items-baseline">
                      <span className="text-sm text-gray-600 mr-2">Telefone:</span>
                      <span className="font-semibold text-gray-900 text-right flex-1 break-words min-w-0">{colaborador.phone_number ? `(${colaborador.phone_number.substring(0,2)}) ${colaborador.phone_number.substring(2,7)}-${colaborador.phone_number.substring(7)}` : 'N/A'}</span>
                    </div>
                    {/* Comissão */}
                    <div className="flex flex-wrap justify-between items-baseline">
                      <span className="text-sm text-gray-600 mr-2">Comissão:</span>
                      <span className="font-semibold text-gray-900 text-right flex-1 break-words min-w-0">{colaborador.commission_percentage}%</span>
                    </div>
                    {/* Status */}
                    <div className="flex flex-wrap justify-between items-baseline">
                      <span className="text-sm text-gray-600 mr-2">Status:</span>
                      <span className="font-semibold text-gray-900 text-right flex-1 break-words min-w-0">{colaborador.status}</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="!rounded-button whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/colaboradores/edit/${colaborador.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="!rounded-button whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/colaboradores/${colaborador.id}/schedule`);
                      }}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="!rounded-button whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(colaborador.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={loadingCollaborators}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loadingCollaborators}>
              {loadingCollaborators ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ColaboradoresPage;