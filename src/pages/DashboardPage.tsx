import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

// Utility Functions (moved from MainApplication for DashboardPage)
const getStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    confirmado: 'bg-green-500',
    pendente: 'bg-yellow-500',
    cancelado: 'bg-red-500',
    vip: 'bg-yellow-500 text-black',
    regular: 'bg-blue-500',
    novo: 'bg-green-500',
    ativa: 'bg-green-500',
    pausada: 'bg-gray-500'
  };
  return colors[status] || 'bg-gray-500';
};

const createButton = (onClick: () => void, icon: string, text: string, variant: 'primary' | 'outline' = 'primary') => (
  <Button
    className={`!rounded-button whitespace-nowrap cursor-pointer ${
      variant === 'primary' ? 'bg-yellow-600 hover:bg-yellow-700 text-black' : ''
    }`}
    variant={variant === 'outline' ? 'outline' : undefined}
    onClick={onClick}
  >
    <i className={`${icon} mr-2`}></i>
    {text}
  </Button>
);

const createCard = (title: string, value: string, change: string, icon: string, colorClass = 'yellow') => (
  <Card className="border-gray-200 hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          <p className={`text-sm text-${colorClass}-600 mt-1`}>{change}</p>
        </div>
        <div className={`w-12 h-12 bg-${colorClass}-100 rounded-lg flex items-center justify-center`}>
          <i className={`${icon} text-${colorClass}-600 text-xl`}></i>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Mock Data (moved from MainApplication for DashboardPage)
const mockData = {
  kpis: [
    { title: 'Faturamento do Mês', value: 'R$ 45.280', change: '+12%', icon: 'fas fa-money-bill-wave' },
    { title: 'Agendamentos Hoje', value: '28', change: '+5', icon: 'fas fa-calendar-check' },
    { title: 'Barbeiro Mais Ativo', value: 'João Silva', change: '85 cortes', icon: 'fas fa-crown' },
    { title: 'Estoque Crítico', value: '3 itens', change: 'Atenção', icon: 'fas fa-exclamation-triangle' }
  ],
  agendamentos: [
    { id: 1, cliente: 'Carlos Santos', servico: 'Corte + Barba', horario: '09:00', barbeiro: 'João Silva', valor: 'R$ 45', status: 'confirmado' },
    { id: 2, cliente: 'Pedro Lima', servico: 'Corte Tradicional', horario: '10:30', barbeiro: 'Maria Costa', valor: 'R$ 30', status: 'pendente' },
    { id: 3, cliente: 'Rafael Oliveira', servico: 'Barba + Bigode', horario: '14:00', barbeiro: 'João Silva', valor: 'R$ 25', status: 'confirmado' },
    { id: 4, cliente: 'Lucas Ferreira', servico: 'Corte Moderno', horario: '16:30', barbeiro: 'Ana Souza', valor: 'R$ 40', status: 'cancelado' }
  ],
  colaboradores: [
    { id: 1, nome: 'João Silva', funcao: 'Barbeiro Sênior', comissao: 'R$ 2.850', cortes: 85, rating: 4.9 },
    { id: 2, nome: 'Maria Costa', funcao: 'Barbeira', comissao: 'R$ 2.240', cortes: 68, rating: 4.8 },
    { id: 3, nome: 'Ana Souza', funcao: 'Barbeira Junior', comissao: 'R$ 1.680', cortes: 42, rating: 4.7 }
  ]
};

const DashboardPage: React.FC = () => {
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [showFecharCaixa, setShowFecharCaixa] = useState(false);

  // Placeholder for specific forms (these would ideally be separate components)
  const renderNovoAgendamento = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => setShowNovoAgendamento(false)}
        >
          <i className="fas fa-arrow-left mr-2"></i>
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
                  onClick={() => setShowNovoAgendamento(false)}
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

  const renderNovoCliente = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => setShowNovoCliente(false)}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Novo Cliente</h1>
      </div>
      <div className="max-w-2xl">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <form id="novo-cliente" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <Input
                    type="text"
                    name="nome"
                    placeholder="Digite o nome completo"
                    className="border-gray-300 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <Input
                    type="tel"
                    name="telefone"
                    placeholder="(11) 99999-9999"
                    className="border-gray-300 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="cliente@email.com"
                    className="border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Nascimento
                  </label>
                  <Input
                    type="date"
                    name="nascimento"
                    className="border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço Completo
                </label>
                <Input
                  type="text"
                  name="endereco"
                  placeholder="Rua, número, bairro, cidade, CEP"
                  className="border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferências e Observações
                </label>
                <textarea
                  name="observacoes"
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                  placeholder="Corte preferido, alergias, observações especiais..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Máximo 500 caracteres</p>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Iniciais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status do Cliente
                    </label>
                    <select name="status" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="novo">Novo Cliente</option>
                      <option value="regular">Regular</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pontos Iniciais
                    </label>
                    <Input
                      type="number"
                      name="pontos"
                      defaultValue="0"
                      className="border-gray-300 text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="!rounded-button whitespace-nowrap cursor-pointer flex-1"
                  onClick={() => setShowNovoCliente(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black flex-1"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Cadastrar Cliente
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderFecharCaixa = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => setShowFecharCaixa(false)}
        >
          <i className="fas fa-arrow-left mr-2"></i>
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
                  onClick={() => setShowFecharCaixa(false)}
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

  const renderSpecificForm = () => {
    if (showNovoAgendamento) return renderNovoAgendamento();
    if (showNovoCliente) return renderNovoCliente();
    if (showFecharCaixa) return renderFecharCaixa();
    return null;
  };

  if (renderSpecificForm()) {
    return renderSpecificForm();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          {createButton(() => setShowNovoAgendamento(true), 'fas fa-plus', 'Novo Agendamento')}
          {createButton(() => setShowNovoCliente(true), 'fas fa-user-plus', 'Novo Cliente')}
          {createButton(() => setShowFecharCaixa(true), 'fas fa-cash-register', 'Fechar Caixa')}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockData.kpis.map((kpi, index) =>
          createCard(kpi.title, kpi.value, kpi.change, kpi.icon)
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-gray-900">Faturamento Mensal</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-line text-4xl text-yellow-600 mb-4"></i>
                <p className="text-gray-600">Gráfico de Performance</p>
                <p className="text-sm text-gray-500 mt-2">Crescimento de 12% este mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-gray-900">Agendamentos Hoje</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {mockData.agendamentos.slice(0, 4).map((agendamento) => (
                  <div key={agendamento.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agendamento.status)}`}></div>
                      <div>
                        <p className="font-medium text-gray-900">{agendamento.cliente}</p>
                        <p className="text-sm text-gray-600">{agendamento.horario} - {agendamento.servico}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-yellow-600">{agendamento.valor}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;