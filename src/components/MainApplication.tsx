import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from 'react-router-dom';
import { useSession } from './SessionContextProvider'; // Importar useSession
import UserDropdownMenu from './UserDropdownMenu'; // Importar o novo componente

const MainApplication: React.FC = () => {
const [activeSection, setActiveSection] = useState('landing');
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
const [showNovoCliente, setShowNovoCliente] = useState(false);
const [showFecharCaixa, setShowFecharCaixa] = useState(false);
const [showNovoColaborador, setShowNovoColaborador] = useState(false);

const { session, loading } = useSession(); // Usar o hook useSession

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

const createFormField = (label: string, name: string, type = 'text', required = false, options: { value: string; label: string }[] = []) => (
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">
{label} {required && '*'}
</label>
{type === 'select' ? (
<select name={name} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required={required}>
{options.map((opt, idx) => (
<option key={idx} value={opt.value}>{opt.label}</option>
))}
</select>
) : type === 'textarea' ? (
<textarea
name={name}
maxLength={500}
className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
placeholder={`Digite ${label.toLowerCase()}...`}
/>
) : (
<Input
type={type}
name={name}
className="border-gray-300 text-sm"
required={required}
placeholder={type === 'tel' ? '(11) 99999-9999' : type === 'email' ? 'email@example.com' : `Digite ${label.toLowerCase()}`}
/>
)}
</div>
);

// Data
const menuItems = [
{ id: 'landing', label: 'Landing Page', icon: 'fas fa-home' },
{ id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
{ id: 'agendamentos', label: 'Agendamentos', icon: 'fas fa-calendar-alt' },
{ id: 'clientes', label: 'Clientes', icon: 'fas fa-users' },
{ id: 'colaboradores', label: 'Colaboradores', icon: 'fas fa-user-tie' },
{ id: 'financeiro', label: 'Financeiro', icon: 'fas fa-dollar-sign' },
{ id: 'estoque', label: 'Estoque', icon: 'fas fa-boxes' },
{ id: 'relatorios', label: 'Relatórios', icon: 'fas fa-chart-bar' },
{ id: 'fidelidade', label: 'Fidelidade', icon: 'fas fa-gift' }
];

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

// Dashboard Component
const renderDashboard = () => (
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

// Agendamentos Component
const renderAgendamentos = () => (
<div className="space-y-6">
<div className="flex justify-between items-center">
<h1 className="text-3xl font-bold text-gray-900">Agendamentos</h1>
{createButton(() => setShowNovoAgendamento(true), 'fas fa-plus', 'Novo Agendamento')}
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
{createButton(() => setShowNovoCliente(true), 'fas fa-user-plus', 'Cadastrar Cliente')}
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
{createButton(() => setShowNovoColaborador(true), 'fas fa-user-plus', 'Adicionar Colaborador')}
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
<div className="flex items-center gap-4">
<div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
<i className="fas fa-ticket-alt text-yellow-600"></i>
</div>
<div>
<h3 className="font-semibold text-gray-900">{promocao.codigo}</h3>
<p className="text-sm text-gray-600">{promocao.tipo}</p>
</div>
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

const renderLanding = () => {
const [searchTerm, setSearchTerm] = useState('');
const [selectedCategory, setSelectedCategory] = useState('todos');

const categories = [
{ id: 'todos', name: 'Todos os Serviços', icon: 'fas fa-th-large' },
{ id: 'beleza', name: 'Beleza & Estética', icon: 'fas fa-spa' },
{ id: 'saude', name: 'Saúde & Bem-estar', icon: 'fas fa-heartbeat' },
{ id: 'fitness', name: 'Fitness & Personal', icon: 'fas fa-dumbbell' },
{ id: 'educacao', name: 'Educação & Coaching', icon: 'fas fa-graduation-cap' },
{ id: 'negocios', name: 'Consultoria & Negócios', icon: 'fas fa-briefcase' },
{ id: 'casa', name: 'Casa & Manutenção', icon: 'fas fa-home' },
{ id: 'auto', name: 'Automotivo', icon: 'fas fa-car' },
{ id: 'pet', name: 'Pet Care', icon: 'fas fa-paw' }
];

const services = [
{ name: 'Barbearia Premium', category: 'beleza', rating: 4.9, price: 'A partir de R$ 35' },
{ name: 'Salão de Beleza', category: 'beleza', rating: 4.8, price: 'A partir de R$ 45' },
{ name: 'Nutricionista', category: 'saude', rating: 4.7, price: 'A partir de R$ 80' },
{ name: 'Personal Trainer', category: 'fitness', rating: 4.9, price: 'A partir de R$ 60' },
{ name: 'Psicólogo Online', category: 'saude', rating: 4.8, price: 'A partir de R$ 120' },
{ name: 'Coach de Carreira', category: 'educacao', rating: 4.6, price: 'A partir de R$ 150' },
{ name: 'Consultoria Financeira', category: 'negocios', rating: 4.8, price: 'A partir de R$ 200' },
{ name: 'Eletricista', category: 'casa', rating: 4.7, price: 'A partir de R$ 80' },
{ name: 'Mecânico Automotivo', category: 'auto', rating: 4.8, price: 'A partir de R$ 100' },
{ name: 'Veterinário', category: 'pet', rating: 4.9, price: 'A partir de R$ 90' },
{ name: 'Manicure & Pedicure', category: 'beleza', rating: 4.7, price: 'A partir de R$ 25' },
{ name: 'Massoterapia', category: 'saude', rating: 4.8, price: 'A partir de R$ 70' }
];

const filteredServices = services.filter(service => {
const matchesCategory = selectedCategory === 'todos' || service.category === selectedCategory;
const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
return matchesCategory && matchesSearch;
});

return (
<div className="min-h-screen bg-white">
{/* Hero Section */}
<section 
className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
style={{
backgroundImage: `linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(45, 45, 45, 0.6)), url('https://readdy.ai/api/search-image?query=modern%20professional%20services%20appointment%20booking%20platform%20with%20diverse%20people%20using%20smartphones%20and%20tablets%20in%20clean%20minimalist%20environment%20with%20soft%20lighting%20and%20contemporary%20design%20elements&width=1440&height=1024&seq=hero-landing&orientation=landscape')`
}}
>
<div className="container mx-auto px-6 text-center text-white">
<h1 className="text-6xl font-bold mb-6 leading-tight">
Agende Seus <span className="text-yellow-400">Serviços Favoritos</span><br />
Em Um Só Lugar
</h1>
<p className="text-xl mb-8 max-w-3xl mx-auto text-gray-200">
Conectamos você aos melhores profissionais da sua região. Beleza, saúde, fitness, consultoria e muito mais. 
Reserve seu horário em segundos e tenha uma experiência excepcional.
</p>

{/* Search Bar */}
<div className="max-w-4xl mx-auto mb-12">
<div className="bg-white rounded-2xl p-6 shadow-2xl">
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div className="relative">
<i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
<Input
type="text"
placeholder="Que serviço você procura?"
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
/>
</div>
<div className="relative">
<i className="fas fa-map-marker-alt absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
<Input
type="text"
placeholder="Sua localização"
className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
/>
</div>
<Button className="!rounded-button whitespace-nowrap h-14 text-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-black">
<i className="fas fa-search mr-2"></i>
Buscar Serviços
</Button>
</div>
</div>
</div>

{/* Quick Stats */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
<div className="text-center">
<div className="text-4xl font-bold text-yellow-400 mb-2">15.000+</div>
<div className="text-gray-200">Profissionais</div>
</div>
<div className="text-center">
<div className="text-4xl font-bold text-yellow-400 mb-2">50.000+</div>
<div className="text-gray-200">Agendamentos</div>
</div>
<div className="text-center">
<div className="text-4xl font-bold text-yellow-400 mb-2">4.9</div>
<div className="text-gray-200">Avaliação Média</div>
</div>
<div className="text-center">
<div className="text-4xl font-bold text-yellow-400 mb-2">95%</div>
<div className="text-gray-200">Satisfação</div>
</div>
</div>
</div>
</section>

{/* Categories Section */}
<section className="py-20 bg-gray-50">
<div className="container mx-auto px-6">
<div className="text-center mb-16">
<h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Por Categoria</h2>
<p className="text-xl text-gray-600 max-w-2xl mx-auto">
Encontre exatamente o que precisa navegando pelas nossas categorias especializadas
</p>
</div>

<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
{categories.slice(1).map((category) => (
<Card
key={category.id}
className={`border-2 cursor-pointer transition-all hover:shadow-lg ${
selectedCategory === category.id
? 'border-yellow-400 bg-yellow-50'
: 'border-gray-200 hover:border-yellow-200'
}`}
onClick={() => setSelectedCategory(category.id)}
>
<CardContent className="p-6 text-center">
<div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
selectedCategory === category.id
? 'bg-yellow-400 text-black'
: 'bg-gray-100 text-gray-600'
}`}>
<i className={`${category.icon} text-2xl`}></i>
</div>
<h3 className="font-semibold text-gray-900 text-sm">{category.name}</h3>
</CardContent>
</Card>
))}
</div>

{/* Services Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
{filteredServices.map((service, index) => (
<Card key={index} className="border-gray-200 cursor-pointer hover:shadow-lg transition-shadow">
<CardContent className="p-6">
<div className="relative mb-4">
<img
src={`https://readdy.ai/api/search-image?query=professional%20${service.name.toLowerCase()}%20service%20provider%20in%20modern%20clean%20workspace%20with%20professional%20tools%20and%20equipment&width=300&height=200&seq=${service.name.replace(/\s+/g, '-').toLowerCase()}&orientation=landscape`}
alt={service.name}
className="w-full h-48 object-cover rounded-lg"
/>
<div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-lg shadow">
<div className="flex items-center gap-1">
<i className="fas fa-star text-yellow-500 text-sm"></i>
<span className="text-sm font-semibold">{service.rating}</span>
</div>
</div>
</div>
<h3 className="font-bold text-gray-900 text-lg mb-2">{service.name}</h3>
<p className="text-yellow-600 font-semibold mb-4">{service.price}</p>
<Button className="!rounded-button whitespace-nowrap w-full bg-yellow-600 hover:bg-yellow-700 text-black">
<i className="fas fa-calendar-alt mr-2"></i>
Agendar Agora
</Button>
</CardContent>
</Card>
))}
</div>
</div>
</section>

{/* How It Works */}
<section className="py-20 bg-white">
<div className="container mx-auto px-6">
<div className="text-center mb-16">
<h2 className="text-4xl font-bold text-gray-900 mb-4">Como Funciona</h2>
<p className="text-xl text-gray-600">Agendar nunca foi tão simples e rápido</p>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
{[
{
step: '1',
title: 'Busque e Compare',
description: 'Encontre profissionais qualificados na sua região e compare preços e avaliações',
icon: 'fas fa-search'
},
{
step: '2',
title: 'Escolha o Horário',
description: 'Selecione o dia e horário que funciona melhor para você em tempo real',
icon: 'fas fa-calendar-check'
},
{
step: '3',
title: 'Confirme e Relaxe',
description: 'Receba confirmação instantânea e lembretes automáticos do seu agendamento',
icon: 'fas fa-check-circle'
}
].map((item, index) => (
<div key={index} className="text-center">
<div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
<i className={`${item.icon} text-2xl text-black`}></i>
</div>
<h3 className="text-2xl font-bold text-gray-900 mb-4">
<span className="text-yellow-600">#{item.step}</span> {item.title}
</h3>
<p className="text-gray-600 text-lg">{item.description}</p>
</div>
))}
</div>
</div>
</section>

{/* CTA Section */}
<section className="py-20 bg-gray-900 text-white">
<div className="container mx-auto px-6 text-center">
<h2 className="text-4xl font-bold mb-4">
Pronto Para Começar?
</h2>
<p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
Junte-se a milhares de usuários que já descobriram a forma mais fácil de agendar serviços
</p>
<div className="flex flex-col sm:flex-row gap-4 justify-center">
<Button className="!rounded-button whitespace-nowrap text-lg px-8 py-4 bg-yellow-600 hover:bg-yellow-700 text-black">
<i className="fas fa-user-plus mr-2"></i>
Cadastrar-se Grátis
</Button>
<Button variant="outline" className="!rounded-button whitespace-nowrap text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-gray-900">
<i className="fas fa-store mr-2"></i>
Sou Profissional
</Button>
</div>
</div>
</section>
</div>
);
};

const renderContent = () => {
if (showNovoAgendamento) return renderNovoAgendamento();
if (showNovoCliente) return renderNovoCliente();
if (showFecharCaixa) return renderFecharCaixa();
if (showNovoColaborador) return null; // Placeholder for Novo Colaborador form
switch (activeSection) {
case 'landing': return renderLanding();
case 'dashboard': return renderDashboard();
case 'agendamentos': return renderAgendamentos();
case 'clientes': return renderClientes();
case 'colaboradores': return renderColaboradores();
case 'financeiro': return renderFinanceiro();
case 'estoque': return renderEstoque();
case 'relatorios': return renderRelatorios();
case 'fidelidade': return renderFidelidade();
default: return renderLanding();
}
};

return (
<div className="flex flex-col min-h-screen bg-gray-50">
{/* Header Section - Always present */}
<header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
<div className="flex items-center justify-between">
{/* Left side of the header */}
<div className="flex items-center gap-4">
{activeSection !== 'landing' && (
<Button
variant="ghost"
className="lg:hidden !rounded-button cursor-pointer"
onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
>
<i className="fas fa-bars"></i>
</Button>
)}
<Link to="/" className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveSection('landing')}>
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
{activeSection !== 'landing' && (
<aside className={`bg-gray-100 text-gray-800 transition-all duration-300 ${
sidebarCollapsed ? 'w-16' : 'w-64'
} min-h-full border-r border-gray-200`}>
<nav className="p-4">
<ul className="space-y-2">
{menuItems.map((item) => (
<li key={item.id}>
<button
onClick={() => setActiveSection(item.id)}
className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
activeSection === item.id
? 'bg-yellow-700 text-white' // Active item: darker yellow background, white text
: 'text-gray-700 hover:bg-gray-200 hover:text-gray-900' // Inactive item: dark gray text, light gray hover
}`}
>
<i className={`${item.icon} text-lg`}></i>
{!sidebarCollapsed && (
<span className="font-medium">{item.label}</span>
)}
</button>
</li>
))}
</ul>
</nav>
</aside>
)}
<main className="flex-1 p-6">
{renderContent()}
</main>
</div>
</div>
);
};

export default MainApplication;