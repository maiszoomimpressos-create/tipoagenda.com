import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const getStatusColor = (status: string) => {
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

export const createButton = (onClick: () => void, icon: string, text: string, variant: 'primary' | 'outline' = 'primary') => (
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

export const createCard = (title: string, value: string, change: string, icon: string, colorClass = 'yellow') => (
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

export const createFormField = (label: string, name: string, type = 'text', required = false, options: { value: string; label: string }[] = []) => (
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
      ></textarea>
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

export const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line', path: '/dashboard' },
  { id: 'agendamentos', label: 'Agendamentos', icon: 'fas fa-calendar-alt', path: '/agendamentos' },
  { id: 'servicos', label: 'Serviços', icon: 'fas fa-briefcase', path: '/servicos' }, // Ícone alterado para 'briefcase'
  { id: 'clientes', label: 'Clientes', icon: 'fas fa-users', path: '/clientes' },
  { id: 'colaboradores', label: 'Colaboradores', icon: 'fas fa-user-tie', path: '/colaboradores' },
  { id: 'financeiro', label: 'Financeiro', icon: 'fas fa-dollar-sign', path: '/financeiro' },
  { id: 'estoque', label: 'Estoque', icon: 'fas fa-boxes', path: '/estoque' },
  { id: 'relatorios', label: 'Relatórios', icon: 'fas fa-chart-bar', path: '/relatorios' },
  { id: 'fidelidade', label: 'Fidelidade', icon: 'fas fa-gift', path: '/fidelidade' }
];

export const mockData = {
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

export const estoque = [
  { id: 1, produto: 'Cera Modeladora', quantidade: 12, minimo: 5, fornecedor: 'HairPro', preco: 'R$ 35,00' },
  { id: 2, produto: 'Shampoo Antiqueda', quantidade: 3, minimo: 5, fornecedor: 'BelezaTotal', preco: 'R$ 50,00' },
  { id: 3, produto: 'Óleo para Barba', quantidade: 20, minimo: 10, fornecedor: 'BarberEssentials', preco: 'R$ 40,00' },
  { id: 4, produto: 'Loção Pós-Barba', quantidade: 8, minimo: 5, fornecedor: 'HairPro', preco: 'R$ 30,00' },
  { id: 5, produto: 'Gel Fixador', quantidade: 4, minimo: 5, fornecedor: 'BelezaTotal', preco: 'R$ 25,00' },
];