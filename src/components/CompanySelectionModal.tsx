import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { setTargetCompanyId } from '@/utils/storage';
import { useIsClient } from '@/hooks/useIsClient';

interface Company {
  id: string;
  name: string;
  image_url: string | null;
  segment_types: { name: string } | null;
}

interface CompanySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CompanySelectionModal: React.FC<CompanySelectionModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { isClient, loadingClientCheck } = useIsClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all active companies and their segment type name
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          image_url,
          segment_types(name)
        `)
        .eq('ativo', true)
        .order('name', { ascending: true });

      if (error) throw error;

      setCompanies(companiesData as Company[]);
    } catch (error: any) {
      console.error('Erro ao carregar empresas para seleção:', error);
      showError('Erro ao carregar empresas: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isClient) {
      fetchCompanies();
    }
  }, [isOpen, isClient, fetchCompanies]);

  const handleSelectCompany = (companyId: string) => {
    setTargetCompanyId(companyId);
    onClose();
    navigate('/agendar'); // Redirect to the client appointment form
  };

  if (loadingClientCheck || loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Selecione a Empresa</DialogTitle>
            <DialogDescription>
              Carregando opções de agendamento...
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 text-center text-gray-600">
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Carregando empresas...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isClient) {
    return null; // Should not happen if ClientProtectedRoute is working, but safe fallback
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecione a Empresa</DialogTitle>
          <DialogDescription>
            Escolha a empresa ou profissional com quem você deseja agendar um serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 p-2 -mx-2">
          {companies.length === 0 ? (
            <p className="text-gray-600 text-center p-4">Nenhuma empresa ativa encontrada para agendamento.</p>
          ) : (
            companies.map((company) => (
              <Card 
                key={company.id} 
                className="border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelectCompany(company.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <img
                    src={company.image_url || `https://readdy.ai/api/search-image?query=professional%20${company.segment_types?.name || 'business'}%20logo&width=64&height=64&seq=${company.id}&orientation=squarish`}
                    alt={company.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{company.name}</h3>
                    <p className="text-sm text-gray-600">{company.segment_types?.name || 'Serviços Gerais'}</p>
                  </div>
                  <Button 
                    className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black flex-shrink-0"
                    size="sm"
                  >
                    Agendar
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanySelectionModal;