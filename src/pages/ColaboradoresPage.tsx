import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createButton, mockData } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';

const ColaboradoresPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Colaboradores</h1>
        {createButton(() => {}, 'fas fa-user-plus', 'Adicionar Colaborador')} {/* Este botão não tem uma rota específica ainda */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockData.colaboradores.map((colaborador) => (
          <Card key={colaborador.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarImage src={`https://readdy.ai/api/search-image?query=professional%20barber%20portrait%20with%20modern%20styling%20tools%20in%20clean%20barbershop%20environment%20with%20professional%20lighting%20and%20neutral%20background&width=80&height=80&seq=${colaborador.id}&orientation=squarish`} />
                  <AvatarFallback className="bg-gray-200 text-gray-700 text-xl">
                    {colaborador.nome.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-gray-900 text-lg">{colaborador.nome}</h3>
                <p className="text-gray-600 mb-3">{colaborador.funcao}</p>
                <div className="space-y-2">
                  {['Comissão', 'Cortes', 'Avaliação'].map((label, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-sm text-gray-600">{label}:</span>
                      <span className="font-semibold text-gray-900">
                        {idx === 0 ? colaborador.comissao : idx === 1 ? colaborador.cortes : (
                          <div className="flex items-center gap-1">
                            {colaborador.rating} <i className="fas fa-star text-yellow-500 text-sm"></i>
                          </div>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ColaboradoresPage;