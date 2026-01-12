import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { format } from 'date-fns';

// Zod schema for new transaction
const newTransactionSchema = z.object({
  transaction_type: z.enum(['recebimento', 'despesa'], {
    errorMap: () => ({ message: "Tipo de transação é obrigatório." })
  }),
  total_amount: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return Number(val.replace(',', '.')) || 0;
      }
      return Number(val) || 0;
    },
    z.number().min(0.01, "O valor deve ser maior que zero.")
  ),
  payment_method: z.string().min(1, "Método de pagamento é obrigatório."),
  transaction_date: z.string().min(1, "Data é obrigatória."),
  observations: z.string().max(500, "Máximo de 500 caracteres.").optional(),
});

type NewTransactionFormValues = z.infer<typeof newTransactionSchema>;

const NovaTransacaoPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewTransactionFormValues>({
    resolver: zodResolver(newTransactionSchema),
    defaultValues: {
      transaction_type: 'recebimento',
      total_amount: 0,
      payment_method: 'dinheiro',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      observations: '',
    },
  });

  const selectedTransactionType = watch('transaction_type');
  const selectedPaymentMethod = watch('payment_method');

  const onSubmit = async (data: NewTransactionFormValues) => {
    setLoading(true);
    if (!session?.user || !primaryCompanyId) {
      showError('Erro de autenticação ou empresa primária não encontrada.');
      setLoading(false);
      return;
    }

    try {
      // Combine date and current time for transaction_date
      const transactionDateTime = `${data.transaction_date}T${format(new Date(), 'HH:mm:ss')}`;

      const { error } = await supabase
        .from('cash_movements')
        .insert({
          company_id: primaryCompanyId,
          user_id: session.user.id,
          transaction_type: data.transaction_type,
          total_amount: data.total_amount,
          payment_method: data.payment_method,
          transaction_date: transactionDateTime,
          observations: data.observations || null,
          appointment_id: null, // Manual transaction, not linked to appointment
        });

      if (error) throw error;

      showSuccess('Transação criada com sucesso!');
      navigate('/financeiro');
    } catch (error: any) {
      console.error('Erro ao criar transação:', error);
      showError('Erro ao criar transação: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loadingPrimaryCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando dados...</p>
      </div>
    );
  }

  if (!session?.user || !primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-center mb-4">
          Você precisa estar logado e ter uma empresa primária para criar transações.
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
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Nova Transação</h1>
      </div>
      <div className="max-w-2xl">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Transação *
                  </Label>
                  <Select 
                    onValueChange={(value) => setValue('transaction_type', value as 'recebimento' | 'despesa', { shouldValidate: true })} 
                    value={selectedTransactionType}
                  >
                    <SelectTrigger id="transaction_type" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recebimento">Recebimento</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.transaction_type && <p className="text-red-500 text-xs mt-1">{errors.transaction_type.message}</p>}
                </div>
                <div>
                  <Label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pagamento *
                  </Label>
                  <Select 
                    onValueChange={(value) => setValue('payment_method', value, { shouldValidate: true })} 
                    value={selectedPaymentMethod}
                  >
                    <SelectTrigger id="payment_method" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Valor *
                  </Label>
                  <Input
                    id="total_amount"
                    type="text"
                    placeholder="0,00"
                    {...register('total_amount')}
                    className="mt-1 border-gray-300 text-sm"
                    onBlur={(e) => {
                      const value = e.target.value.replace(',', '.');
                      setValue('total_amount', Number(value) || 0, { shouldValidate: true });
                    }}
                  />
                  {errors.total_amount && <p className="text-red-500 text-xs mt-1">{errors.total_amount.message}</p>}
                </div>
                <div>
                  <Label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    {...register('transaction_date')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.transaction_date && <p className="text-red-500 text-xs mt-1">{errors.transaction_date.message}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </Label>
                <Textarea
                  id="observations"
                  maxLength={500}
                  {...register('observations')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                  placeholder="Observações sobre a transação..."
                ></Textarea>
                {errors.observations && <p className="text-red-500 text-xs mt-1">{errors.observations.message}</p>}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="!rounded-button whitespace-nowrap cursor-pointer flex-1"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black flex-1"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Transação'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovaTransacaoPage;

