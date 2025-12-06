import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Contract {
  id: string;
  contract_name: string;
  created_at: string;
}

const ContractList: React.FC = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('contracts')
      .select('id, contract_name, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      showError('Erro ao carregar contratos: ' + error.message);
      console.error('Error fetching contracts:', error);
    } else if (data) {
      setContracts(data);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleDeleteClick = (contractId: string) => {
    setContractToDelete(contractId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (contractToDelete && session?.user) {
      setLoading(true);
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractToDelete)
        .eq('user_id', session.user.id); // Ensure user can only delete their own contracts

      if (error) {
        showError('Erro ao excluir contrato: ' + error.message);
        console.error('Error deleting contract:', error);
      } else {
        showSuccess('Contrato excluído com sucesso!');
        fetchContracts(); // Refresh the list
      }
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  if (loading) {
    return <p className="text-gray-700 dark:text-gray-300">Carregando contratos...</p>;
  }

  if (!session?.user) {
    return <p className="text-red-500">Você precisa estar logado para ver os contratos.</p>;
  }

  return (
    <div className="space-y-4">
      {contracts.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">Nenhum contrato cadastrado ainda.</p>
      ) : (
        contracts.map((contract) => (
          <Card key={contract.id} className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{contract.contract_name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Criado em: {new Date(contract.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="!rounded-button whitespace-nowrap"
                  onClick={() => navigate(`/settings/edit-contract/${contract.id}`)}
                >
                  <i className="fas fa-edit mr-2"></i>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="!rounded-button whitespace-nowrap"
                  onClick={() => handleDeleteClick(contract.id)}
                >
                  <i className="fas fa-trash-alt mr-2"></i>
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractList;