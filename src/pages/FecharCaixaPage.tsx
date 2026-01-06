import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCashRegister } from '@/hooks/useCashRegister';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { showError } from '@/utils/toast';

// Zod schema for cash register form
const cashRegisterSchema = z.object({
  notas_100: z.preprocess((val) => Number(val) || 0, z.number().int().min(0)),
  notas_50: z.preprocess((val) => Number(val) || 0, z.number().int().min(0)),
  notas_20: z.preprocess((val) => Number(val) || 0, z.number().int().min(0)),
  outras_moedas: z.preprocess((val) => Number(String(val).replace(',', '.')) || 0, z.number().min(0)),
  despesa_produtos: z.preprocess((val) => Number(String(val).replace(',', '.')) || 0, z.number().min(0)),
  outras_despesas: z.preprocess((val) => Number(String(val).replace(',', '.')) || 0, z.number().min(0)),
  descricao_despesas: z.string().max(500).optional(),
  observacoes_fechamento: z.string().max(500).optional(),
});

type CashRegisterFormValues = z.infer<typeof cashRegisterSchema>;

const FecharCaixaPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, isClosed, submitCashClose } = useCashRegister();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CashRegisterFormValues>({
    resolver: zodResolver(cashRegisterSchema),
    defaultValues: {
      notas_100: 0,
      notas_50: 0,
      notas_20: 0,
      outras_moedas: 0,
      despesa_produtos: 0,
      outras_despesas: 0,
      descricao_despesas: '',
      observacoes_fechamento: '',
    },
  });

  const formValues = watch();

  // Calculations for cash count
  const totalNotas100 = formValues.notas_100 * 100;
  const totalNotas50 = formValues.notas_50 * 50;
  const totalNotas20 = formValues.notas_20 * 20;
  const totalContado = totalNotas100 + totalNotas50 + totalNotas20 + formValues.outras_moedas;

  // Calculations for expenses
  const totalDespesas = formValues.despesa_produtos + formValues.outras_despesas;

  // Calculations for final profit
  const lucroLiquido = data.totalDay - totalDespesas;

  const onSubmit = async (formData: CashRegisterFormValues) => {
    if (isClosed) {
      showError('O caixa já foi fechado para o dia de hoje.');
      return;
    }
    
    // Basic validation check: Does the counted cash match the expected cash receipts?
    if (totalContado !== data.totalCash) {
      const diff = Math.abs(totalContado - data.totalCash);
      const message = totalContado > data.totalCash 
        ? `O dinheiro contado (R$ ${totalContado.toFixed(2).replace('.', ',')}) está R$ ${diff.toFixed(2).replace('.', ',')} ACIMA do esperado (R$ ${data.totalCash.toFixed(2).replace('.', ',')}).`
        : `O dinheiro contado (R$ ${totalContado.toFixed(2).replace('.', ',')}) está R$ ${diff.toFixed(2).replace('.', ',')} ABAIXO do esperado (R$ ${data.totalCash.toFixed(2).replace('.', ',')}).`;
      
      const confirmProceed = window.confirm(`${message} Deseja prosseguir com o fechamento de caixa, registrando a diferença?`);
      
      if (!confirmProceed) {
        return;
      }
    }

    await submitCashClose(formData, totalContado, totalDespesas, lucroLiquido);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando dados do caixa...</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Fechamento de Caixa</h1>
      </div>
      
      {isClosed && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Caixa Fechado!</strong>
          <span className="block sm:inline ml-2">O caixa já foi fechado para o dia de hoje.</span>
        </div>
      )}

      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total em Dinheiro (Esperado)</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">R$ {data.totalCash.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-money-bill text-green-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cartão/PIX</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">R$ {data.totalCardPix.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-credit-card text-blue-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Faturamento Bruto do Dia</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-2">R$ {data.totalDay.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calculator text-yellow-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Conferência de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Dinheiro Físico Contado</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Notas de R$ 100,00:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          {...register('notas_100')}
                          className="w-20 text-sm border-gray-300"
                          min="0"
                        />
                        <span className="text-sm text-gray-600">= R$ {totalNotas100.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Notas de R$ 50,00:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          {...register('notas_50')}
                          className="w-20 text-sm border-gray-300"
                          min="0"
                        />
                        <span className="text-sm text-gray-600">= R$ {totalNotas50.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Notas de R$ 20,00:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          {...register('notas_20')}
                          className="w-20 text-sm border-gray-300"
                          min="0"
                        />
                        <span className="text-sm text-gray-600">= R$ {totalNotas20.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Moedas e outras:</span>
                      <Input
                        type="number"
                        step="0.01"
                        {...register('outras_moedas')}
                        className="w-24 text-sm border-gray-300"
                        min="0"
                      />
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-gray-900">Total Contado:</span>
                        <span className={totalContado === data.totalCash ? 'text-green-600' : 'text-red-600'}>
                          R$ {totalContado.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {totalContado !== data.totalCash && (
                        <p className="text-xs text-red-500 mt-1">
                          Diferença de R$ {Math.abs(totalContado - data.totalCash).toFixed(2).replace('.', ',')} em relação ao esperado.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Despesas do Dia</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compra de produtos
                      </label>
                      <Input
                        type="number"
                        {...register('despesa_produtos')}
                        step="0.01"
                        className="border-gray-300 text-sm"
                        min="0"
                      />
                      {errors.despesa_produtos && <p className="text-red-500 text-xs mt-1">{errors.despesa_produtos.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Outras despesas
                      </label>
                      <Input
                        type="number"
                        {...register('outras_despesas')}
                        step="0.01"
                        className="border-gray-300 text-sm"
                        min="0"
                      />
                      {errors.outras_despesas && <p className="text-red-500 text-xs mt-1">{errors.outras_despesas.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição das despesas
                      </label>
                      <Textarea
                        {...register('descricao_despesas')}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
                        placeholder="Descreva as despesas do dia..."
                      ></Textarea>
                      {errors.descricao_despesas && <p className="text-red-500 text-xs mt-1">{errors.descricao_despesas.message}</p>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Faturamento Bruto</p>
                      <p className="text-lg font-bold text-gray-900">R$ {data.totalDay.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Despesas</p>
                      <p className="text-lg font-bold text-red-600">R$ {totalDespesas.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Lucro Líquido</p>
                      <p className="text-xl font-bold text-green-600">R$ {lucroLiquido.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações do Fechamento
                </label>
                <Textarea
                  {...register('observacoes_fechamento')}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                  placeholder="Observações gerais sobre o dia..."
                ></Textarea>
                <p className="text-xs text-gray-500 mt-1">Máximo 500 caracteres</p>
                {errors.observacoes_fechamento && <p className="text-red-500 text-xs mt-1">{errors.observacoes_fechamento.message}</p>}
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
                  disabled={loading || isClosed}
                >
                  <i className="fas fa-lock mr-2"></i>
                  {loading ? 'Fechando...' : 'Fechar Caixa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FecharCaixaPage;