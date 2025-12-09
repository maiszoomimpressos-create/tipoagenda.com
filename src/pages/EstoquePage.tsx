import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { estoque } from '@/lib/dashboard-utils';

const EstoquePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Estoque</h1>
        <Button className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black">
          <i className="fas fa-plus mr-2"></i>
          Adicionar Produto
        </Button>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <i className="fas fa-exclamation-triangle text-red-600"></i>
          <div>
            <h3 className="font-semibold text-red-800">Atenção: Produtos com Estoque Baixo</h3>
            <p className="text-sm text-red-700">3 produtos estão abaixo do estoque mínimo</p>
          </div>
        </div>
      </div>
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Produtos em Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Produto</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Quantidade</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Fornecedor</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Preço</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {estoque.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <i className="fas fa-bottle-droplet text-gray-600"></i>
                        </div>
                        <span className="font-medium text-gray-900">{item.produto}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${item.quantidade < item.minimo ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.quantidade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.fornecedor}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{item.preco}</td>
                    <td className="py-3 px-4">
                      {item.quantidade < item.minimo ? (
                        <Badge className="bg-red-500 text-white text-xs">Baixo Estoque</Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white text-xs">Normal</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EstoquePage;