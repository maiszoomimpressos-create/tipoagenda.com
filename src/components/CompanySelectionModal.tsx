import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import CompanyCard from './CompanyCard'; // Importar o novo componente CompanyCard

interface Company {
  id: string;
  name: string;
  image_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface CompanySelectionModalProps {
  userId: string;
  onCompanySelected: (companyId: string) => void;
  onClose: () => void;
}

export const CompanySelectionModal: React.FC<CompanySelectionModalProps> = ({
  userId, // Recebe o userId como prop
  onCompanySelected,
  onClose,
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);

        // Busca as empresas associadas ao usuário logado (cliente)
        const { data, error } = await supabase
          .from('user_companies') // Presumo que haja uma tabela 'user_companies' para associar usuários a empresas
          .select('company_id, companies(id, name, image_url, address, city, state)')
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const userCompanies: Company[] = data.map((uc: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: uc.companies.id,
            name: uc.companies.name,
            image_url: uc.companies.image_url,
            address: uc.companies.address,
            city: uc.companies.city,
            state: uc.companies.state,
          }));
          setCompanies(userCompanies);
          // Se houver apenas uma empresa, seleciona automaticamente
          if (userCompanies.length === 1) {
            setSelectedCompanyId(userCompanies[0].id);
          }
        } else {
          showError('Nenhuma empresa encontrada para este usuário.');
          onClose(); // Fecha o modal se nenhuma empresa for encontrada
        }
      } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error('Erro ao buscar empresas:', error);
        showError('Erro ao carregar empresas: ' + error.message);
        onClose(); // Fecha o modal em caso de erro
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchCompanies();
    }
  }, [userId, onClose]);

  const handleSelect = () => {
    if (selectedCompanyId) {
      onCompanySelected(selectedCompanyId);
    } else {
      showError('Por favor, selecione uma empresa.');
    }
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando Empresas...</DialogTitle>
            <DialogDescription>Aguarde enquanto carregamos suas empresas.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecione a Empresa</DialogTitle>
          <DialogDescription>
            Por favor, selecione a empresa para a qual deseja agendar um serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              isSelected={selectedCompanyId === company.id}
              onClick={setSelectedCompanyId}
            />
          ))}
        </div>
        <Button onClick={handleSelect} className="w-full">
          Confirmar Seleção
        </Button>
      </DialogContent>
    </Dialog>
  );
};
