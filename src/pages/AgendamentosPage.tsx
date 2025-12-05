import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusColor, createButton, mockData } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';

const AgendamentosPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
        {createButton(() => navigate('/novo-agendamento'), 'fas fa-plus', 'Novo Agendamento')}
      </div>

      <div className="flex gap-4 items-center">
        <Tabs defaultValue="dia" className="w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
        <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          <option>Todos os Barbeiros</option>
          {mockData.colaboradores.map(col => (
            <option key={col.id}>{col.nome}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {mockData.agendamentos.map((agendamento) => (
          <Card key={agendamento.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{agendamento.cliente}</h3>
                    <p className="text-sm text-gray-600">{agendamento.servico}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{agendamento.horario}</p>
                  <p className="text-sm text-gray-600">{agendamento.barbeiro}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-yellow-600">{agendamento.valor}</p>
                  <Badge className={`${getStatusColor(agendamento.status)} text-white text-xs`}>
                    {agendamento.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AgendamentosPage;