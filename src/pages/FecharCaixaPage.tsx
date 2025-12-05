import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFormField } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const FecharCaixaPage: React.FC = () => {
  const navigate = useNavigate();

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
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total em Dinheiro</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">R$ 1.240,00</p>
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
                  <p className="text-2xl font-bold text-blue-600 mt-2">R$ 2.180,00</p>
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
                  <p className="text-sm font-medium text-gray-600">Total do Dia</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-2">R$ 3.420,00</p>
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
            <form id="fechamento-caixa" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Dinheiro Físico</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Notas de R$ 100,00:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          name="notas_100"
                          className="w-20 text-sm border-gray-300"
                          min="0"
                          defaultValue="8"
                        />
                        <span className="text-sm text-gray-600">= R$ 800,00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Notas de R$ 50,00:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          name="notas_50"
                          className="w-20 text-sm border-gray-300"
                          min="0"
                          defaultValue="4"
                        />
                        <span className="text-sm text-gray-600">= R$ 200,00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Notas de R$ 20,00:</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          name="notas_20"
                          className="w-20 text-sm border-gray-300"
                          min="0"
                          defaultValue="12"
                        />
                        <span className="text-sm text-gray-600">= R$ 240,00</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Moedas e outras:</span>
                      <Input
                        type="number"
                        name="outras_moedas"
                        step="0.01"
                        className="w-24 text-sm border-gray-300"
                        min="0"
                        defaultValue="0.00"
                      />
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-gray-900">Total Contado:</span>
                        <span className="text-green-600">R$ 1.240,00</span>
                      </div>
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
                        name="despesa_produtos"
                        step="0.01"
                        className="border-gray-300 text-sm"
                        min="0"
                        defaultValue="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Outras despesas
                      </label>
                      <Input
                        type="number"
                        name="outras_despesas"
                        step="0.01"
                        className="border-gray-300 text-sm"
                        min="0"
                        defaultValue="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição das despesas
                      </label>
                      <textarea
                        name="descricao_despesas"
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
                        placeholder="Descreva as despesas do dia..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Faturamento Bruto</p>
                      <p className="text-lg font-bold text-gray-900">R$ 3.420,00</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Despesas</p>
                      <p className="text-lg font-bold text-red-600">R$ 0,00</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Lucro Líquido</p>
                      <p className="text-xl font-bold text-green-600">R$ 3.420,00</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações do Fechamento
                </label>
                <textarea
                  name="observacoes_fechamento"
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                  placeholder="Observações gerais sobre o dia..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Máximo 500 caracteres</p>
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="!rounded-button whitespace-nowrap cursor-pointer flex-1"
                  onClick={() => navigate(-1)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black flex-1"
                >
                  <i className="fas fa-lock mr-2"></i>
                  Fechar Caixa
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