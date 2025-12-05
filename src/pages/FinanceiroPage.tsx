import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createButton, createCard } from '@/lib/dashboard-utils';

const FinanceiroPage: React.FC = () => {
  const financeCards = [
    { title: 'Entradas', value: 'R$ 48.520', icon: 'fas fa-arrow-up', color: 'green' },
    { title: 'Saídas', value: 'R$ 12.340', icon: 'fas fa-arrow-down', color: 'red' },
    { title: 'Saldo', value: 'R$ 36.180', icon: 'fas fa-wallet', color: 'yellow' }
  ];

  const transacoes = [
    { tipo: 'entrada', descricao: 'Corte + Barba - Carlos Santos', valor: 'R$ 45,00', data: '30/10/2025' },
    { tipo: 'entrada', descricao: 'Corte Tradicional - Pedro Lima', valor: 'R$ 30,00', data: '30/10/2025' },
    { tipo: 'saida', descricao: 'Compra de produtos - Beauty Supply', valor: 'R$ 250,00', data: '29/10/2025' },
    { tipo: 'entrada', descricao: 'Barba + Bigode - Rafael Oliveira', valor: 'R$ 25,00', data: '29/10/2025' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
        <div className="flex gap-3">
          {createButton(() => {}, 'fas fa-download', 'Exportar PDF', 'outline')}
          {createButton(() => {}, 'fas fa-plus', 'Nova Transação')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {financeCards.map((card, idx) =>
          createCard(card.title, card.value, '', card.icon, card.color)
        )}
      </div>

      <Card className="border-gray-200">
        <CardHeader><CardTitle className="text-gray-900">Transações Recentes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transacoes.map((transacao, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    transacao.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <i className={`fas ${transacao.tipo === 'entrada' ? 'fa-arrow-up text-green-600' : 'fa-arrow-down text-red-600'}`}></i>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transacao.descricao}</p>
                    <p className="text-sm text-gray-600">{transacao.data}</p>
                  </div>
                </div>
                <p className={`font-semibold ${transacao.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                  {transacao.tipo === 'entrada' ? '+' : '-'}{transacao.valor}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceiroPage;