import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

// Zod schema for contract registration
const contractSchema = z.object({
  contractName: z.string().min(1, "O nome do contrato é obrigatório."),
  contractContent: z.string().min(1, "O conteúdo do contrato é obrigatório."),
});

type ContractFormValues = z.infer<typeof contractSchema>;

const ContractRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractName: '',
      contractContent: '',
    },
  });

  const onSubmit = async (data: ContractFormValues) => {
    setLoading(true);
    if (!session?.user) {
      showError('Você precisa estar logado para cadastrar um contrato.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('contracts')
      .insert({
        user_id: session.user.id,
        contract_name: data.contractName,
        contract_content: data.contractContent,
      });

    if (error) {
      showError('Erro ao cadastrar contrato: ' + error.message);
      console.error('Error inserting contract:', error);
    } else {
      showSuccess('Contrato cadastrado com sucesso!');
      navigate('/settings'); // Go back to settings page
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
        <CardHeader className="relative text-center pb-6">
          <Button
            variant="ghost"
            className="absolute left-0 top-0 !rounded-button whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-white mt-8">
            Cadastrar Novo Contrato
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Preencha os detalhes do novo modelo de contrato.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="contractName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Contrato *</Label>
              <Input
                id="contractName"
                type="text"
                placeholder="Ex: Contrato de Prestação de Serviços"
                {...register('contractName')}
                className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
              />
              {errors.contractName && <p className="text-red-500 text-xs mt-1">{errors.contractName.message}</p>}
            </div>
            <div>
              <Label htmlFor="contractContent" className="text-sm font-medium text-gray-700 dark:text-gray-300">Conteúdo do Contrato *</Label>
              <Textarea
                id="contractContent"
                placeholder="Insira o texto completo do contrato aqui..."
                {...register('contractContent')}
                rows={10}
                className="mt-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
              />
              {errors.contractContent && <p className="text-red-500 text-xs mt-1">{errors.contractContent.message}</p>}
            </div>
            <Button
              type="submit"
              className="w-full !rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black font-semibold py-2.5 text-base"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Salvar Contrato'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractRegistrationPage;