import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFormField } from '@/lib/dashboard-utils';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NovoAgendamentoPage: React.FC = () => {
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
        <h1 className="text-3xl font-bold text-gray-900">Novo Agendamento</h1>
      </div>
      <div className="max-w-2xl">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <form id="novo-agendamento" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <select name="cliente" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Selecione o cliente</option>
                    <option value="carlos-santos">Carlos Santos</option>
                    <option value="pedro-lima">Pedro Lima</option>
                    <option value="rafael-oliveira">Rafael Oliveira</option>
                    <option value="lucas-ferreira">Lucas Ferreira</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barbeiro *
                  </label>
                  <select name="barbeiro" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Selecione o barbeiro</option>
                    <option value="joao-silva">João Silva</option>
                    <option value="maria-costa">Maria Costa</option>
                    <option value="ana-souza">Ana Souza</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <Input
                    type="date"
                    name="data"
                    className="border-gray-300 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário *
                  </label>
                  <select name="horario" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                    <option value="">Selecione o horário</option>
                    <option value="08:00">08:00</option>
                    <option value="08:30">08:30</option>
                    <option value="09:00">09:00</option>
                    <option value="09:30">09:30</option>
                    <option value="10:00">10:00</option>
                    <option value="10:30">10:30</option>
                    <option value="11:00">11:00</option>
                    <option value="11:30">11:30</option>
                    <option value="14:00">14:00</option>
                    <option value="14:30">14:30</option>
                    <option value="15:00">15:00</option>
                    <option value="15:30">15:30</option>
                    <option value="16:00">16:00</option>
                    <option value="16:30">16:30</option>
                    <option value="17:00">17:00</option>
                    <option value="17:30">17:30</option>
                    <option value="18:00">18:00</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serviços *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" name="servicos" value="corte" className="mr-2" />
                    <span className="text-sm">Corte Tradicional - R$ 30,00</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" name="servicos" value="corte-barba" className="mr-2" />
                    <span className="text-sm">Corte + Barba - R$ 45,00</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" name="servicos" value="barba" className="mr-2" />
                    <span className="text-sm">Barba + Bigode - R$ 25,00</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" name="servicos" value="corte-moderno" className="mr-2" />
                    <span className="text-sm">Corte Moderno - R$ 40,00</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento
                </label>
                <select name="pagamento" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao-debito">Cartão de Débito</option>
                  <option value="cartao-credito">Cartão de Crédito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                  placeholder="Observações sobre o agendamento..."
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
                  <i className="fas fa-check mr-2"></i>
                  Agendar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovoAgendamentoPage;