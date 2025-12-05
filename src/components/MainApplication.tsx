import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link, Outlet, useLocation } from 'react-router-dom'; // Importar Outlet e useLocation
import { useSession } from './SessionContextProvider';
import UserDropdownMenu from './UserDropdownMenu';

const MainApplication: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Removido showNovoAgendamento, showNovoCliente, showFecharCaixa, showNovoColaborador
  // pois a lógica de renderização de formulários específicos será movida para as páginas correspondentes ou tratada de outra forma.

  const { session, loading } = useSession();
  const location = useLocation(); // Usar useLocation para verificar a rota atual

  // Utility Functions
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

  // createCard e createFormField removidos pois não são mais usados diretamente aqui.

  // Data
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line', path: '/dashboard' },
    { id: 'agendamentos', label: 'Agendamentos', icon: 'fas fa-calendar-alt', path: '/agendamentos' },
    { id: 'clientes', label: 'Clientes', icon: 'fas fa-users', path: '/clientes' },
    { id: 'colaboradores', label: 'Colaboradores', icon: 'fas fa-user-tie', path: '/colaboradores' },
    { id: 'financeiro', label: 'Financeiro', icon: 'fas fa-dollar-sign', path: '/financeiro' },
    { id: 'estoque', label: 'Estoque', icon: 'fas fa-boxes', path: '/estoque' },
    { id: 'relatorios', label: 'Relatórios', icon: 'fas fa-chart-bar', path: '/relatorios' },
    { id: 'fidelidade', label: 'Fidelidade', icon: 'fas fa-gift', path: '/fidelidade' }
  ];

  const mockData = { // Mantido apenas para renderAgendamentos, Clientes, Colaboradores, Financeiro, Estoque, Relatorios, Fidelidade
    agendamentos: [
      { id: 1, cliente: 'Carlos Santos', servico: 'Corte + Barba', horario: '09:00', barbeiro: 'João Silva', valor: 'R$ 45', status: 'confirmado' },
      { id: 2, cliente: 'Pedro Lima', servico: 'Corte Tradicional', horario: '10:30', barbeiro: 'Maria Costa', valor: 'R$ 30', status: 'pendente' },
      { id: 3, cliente: 'Rafael Oliveira', servico: 'Barba + Bigode', horario: '14:00', barbeiro: 'João Silva', valor: 'R$ 25', status: 'confirmado' },
      { id: 4, cliente: 'Lucas Ferreira', servico: 'Corte Moderno', horario: '16:30', barbeiro: 'Ana Souza', valor: 'R$ 40', status: 'cancelado' }
    ],
    clientes: [
      { id: 1, nome: 'Carlos Santos', telefone: '(11) 99999-9999', visitas: 15, pontos: 450, status: 'vip' },
      { id: 2, nome: 'Pedro Lima', telefone: '(11) 88888-8888', visitas: 8, pontos: 240, status: 'regular' },
      { id: 3, nome: 'Rafael Oliveira', telefone: '(11) 77777-7777', visitas: 22, pontos: 660, status: 'vip' },
      { id: 4, nome: 'Lucas Ferreira', telefone: '(11) 66666-6666', visitas: 3, pontos: 90, status: 'novo' }
    ],
    colaboradores: [
      { id: 1, nome: 'João Silva', funcao: 'Barbeiro Sênior', comissao: 'R$ 2.850', cortes: 85, rating: 4.9 },
      { id: 2, nome: 'Maria Costa', funcao: 'Barbeira', comissao: 'R$ 2.240', cortes: 68, rating: 4.8 },
      { id: 3, nome: 'Ana Souza', funcao: 'Barbeira Junior', comissao: 'R$ 1.680', cortes: 42, rating: 4.7 }
    ]
  };

  const estoque = [
    { id: 1, produto: 'Cera Modeladora', quantidade: 12, minimo: 5, fornecedor: 'HairPro', preco: 'R$ 35,00' },
    { id: 2, produto: 'Shampoo Antiqueda', quantidade: 3, minimo: 5, fornecedor: 'BelezaTotal', preco: 'R$ 50,00' },
    { id: 3, produto: 'Óleo para Barba', quantidade: 20, minimo: 10, fornecedor: 'BarberEssentials', preco: 'R$ 40,00' },
    { id: 4, produto: 'Loção Pós-Barba', quantidade: 8, minimo: 5, fornecedor: 'HairPro', preco: 'R$ 30,00' },
    { id: 5, produto: 'Gel Fixador', quantidade: 4, minimo: 5, fornecedor: 'BelezaTotal', preco: 'R$ 25,00' },
  ];

  // Agendamentos Component
  const renderAgendamentos = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
        {createButton(() => {}, 'fas fa-plus', 'Novo Agendamento')} {/* Ajustado para não usar setShowNovoAgendamento */}
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

  // Clientes Component
  const renderClientes = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
        {createButton(() => {}, 'fas fa-user-plus', 'Cadastrar Cliente')} {/* Ajustado */}
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <Input placeholder="Buscar cliente..." className="border-gray-300 text-sm" />
        </div>
        {createButton(() => {}, 'fas fa-filter', 'Filtros', 'outline')}
      </div>
      <div className="grid gap-4">
        {mockData.clientes.map((cliente) => (
          <Card key={cliente.id} className="border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gray-200 text-gray-700">
                      {cliente.nome.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
                    <p className="text-sm text-gray-600">{cliente.telefone}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{cliente.visitas} visitas</p>
                  <p className="text-sm text-yellow-600">{cliente.pontos} pontos</p>
                </div>
                <Badge className={`${getStatusColor(cliente.status)} text-xs`}>
                  {cliente.status.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Colaboradores Component
  const renderColaboradores = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Colaboradores</h1>
        {createButton(() => {}, 'fas fa-user-plus', 'Adicionar Colaborador')} {/* Ajustado */}
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

  // Financeiro Component
  const renderFinanceiro = () => {
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

  const renderEstoque = () => (
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

  const renderRelatorios = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <div className="flex gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Último mês</option>
            <option>Últimos 3 meses</option>
            <option>Último ano</option>
          </select>
          <Button variant="outline" className="!rounded-button whitespace-nowrap cursor-pointer">
            <i className="fas fa-download mr-2"></i>
            Exportar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-chart-line text-blue-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Faturamento</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">R$ 45.280</p>
              <p className="text-sm text-green-600 mt-1">+12% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-receipt text-green-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">R$ 38,50</p>
              <p className="text-sm text-green-600 mt-1">+5% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-users text-purple-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Clientes Atendidos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">1.176</p>
              <p className="text-sm text-green-600 mt-1">+8% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-times-circle text-red-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-600">Cancelamentos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
              <p className="text-sm text-red-600 mt-1">-3% vs mês anterior</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Performance por Barbeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.colaboradores.map((colaborador) => (
                <div key={colaborador.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-sm">
                        {colaborador.nome.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-gray-900">{colaborador.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{colaborador.cortes} cortes</p>
                    <p className="text-sm text-yellow-600">{colaborador.comissao}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Serviços Mais Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { servico: 'Corte + Barba', quantidade: 245, percentual: 45 },
                { servico: 'Corte Tradicional', quantidade: 189, percentual: 35 },
                { servico: 'Barba + Bigode', quantidade: 87, percentual: 16 },
                { servico: 'Corte Moderno', quantidade: 23, percentual: 4 }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{item.servico}</span>
                    <span className="text-sm text-gray-600">{item.quantidade}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full"
                      style={{ width: `${item.percentual}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderFidelidade = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Fidelidade e Promoções</h1>
        <Button className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black">
          <i className="fas fa-plus mr-2"></i>
          Nova Promoção
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Configuração de Pontos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Regras Atuais</h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                <li>• 1 ponto para cada R$ 1,00 gasto</li>
                <li>• 100 pontos = R$ 10,00 de desconto</li>
                <li>• Pontos expiram em 12 meses</li>
              </ul>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pontos por Real gasto
                </label>
                <Input type="number" defaultValue="1" className="border-gray-300 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pontos para desconto
                </label>
                <Input type="number" defaultValue="100" className="border-gray-300 text-sm" />
              </div>
              <Button className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black w-full">
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Criar Cupom de Desconto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código do Cupom
              </label>
              <Input placeholder="Ex: DESCONTO20" className="border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Desconto
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>Percentual</option>
                <option>Valor Fixo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor do Desconto
              </label>
              <Input type="number" placeholder="20" className="border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Validade
              </label>
              <Input type="date" className="border-gray-300 text-sm" />
            </div>
            <Button className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black w-full">
              Criar Cupom
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Promoções Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { codigo: 'DESCONTO20', tipo: '20% de desconto', validade: '31/12/2025', usos: 45, status: 'ativa' },
              { codigo: 'PRIMEIRA10', tipo: 'R$ 10,00 de desconto', validade: '15/11/2025', usos: 12, status: 'ativa' },
              { codigo: 'FIDELIDADE', tipo: '15% de desconto', validade: '30/11/2025', usos: 78, status: 'pausada' }
            ].map((promocao, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-ticket-alt text-yellow-600"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{promocao.codigo}</h3>
                  <p className="text-sm text-gray-600">{promocao.tipo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Válido até {promocao.validade}</p>
                  <p className="text-sm text-gray-600">{promocao.usos} usos</p>
                </div>
                <Badge className={`${promocao.status === 'ativa' ? 'bg-green-500' : 'bg-gray-500'} text-white text-xs`}>
                  {promocao.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Determine if the current path is an "app" path (i.e., not landing or auth)
  const isAppPath = ['/dashboard', '/agendamentos', '/clientes', '/colaboradores', '/financeiro', '/estoque', '/relatorios', '/fidelidade'].includes(location.pathname);

  const handleMenuItemClick = (path: string) => {
    // Reset any specific form states when navigating
    // setShowNovoAgendamento(false); // Removido
    // setShowNovoCliente(false); // Removido
    // setShowFecharCaixa(false); // Removido
    // setShowNovoColaborador(false); // Removido
    // Navigate to the new path
    window.location.href = path; // Using window.location.href to force full page reload for now
  };

  // renderSpecificForm removido, pois a lógica de formulários específicos agora está na DashboardPage ou será em outras páginas.

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header Section - Always present */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side of the header */}
          <div className="flex items-center gap-4">
            {isAppPath && ( // Show hamburger only on app paths
              <Button
                variant="ghost"
                className="lg:hidden !rounded-button cursor-pointer"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <i className="fas fa-bars"></i>
              </Button>
            )}
            <Link to="/" className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-alt text-white"></i>
              </div>
              <h1 className="text-xl font-bold text-gray-900">TipoAgenda</h1>
            </Link>
          </div>

          {/* Right side of the header */}
          {loading ? (
            <div className="w-24 h-8 bg-gray-200 rounded-button animate-pulse"></div> // Placeholder for loading state
          ) : session ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="!rounded-button cursor-pointer relative">
                <i className="fas fa-bell text-gray-600"></i>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">3</span>
              </Button>
              <UserDropdownMenu session={session} />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="!rounded-button whitespace-nowrap text-gray-700 hover:bg-gray-100">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black">
                  Cadastrar
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main content area (sidebar + main content) */}
      <div className="flex flex-1 pt-16"> {/* Adicionado padding-top para compensar o header fixo */}
        {isAppPath && ( // Show sidebar only on app paths
          <aside className={`bg-gray-900 text-white transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          } min-h-full`}>
            <nav className="p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                        location.pathname === item.path
                          ? 'bg-yellow-600 text-black'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <i className={`${item.icon} text-lg`}></i>
                      {!sidebarCollapsed && (
                        <span className="font-medium">{item.label}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
        <main className="flex-1 p-6">
          {/* renderSpecificForm() removido */}
          <Outlet /> {/* Render nested routes here */}
        </main>
      </div>
    </div>
  );
};

export default MainApplication;