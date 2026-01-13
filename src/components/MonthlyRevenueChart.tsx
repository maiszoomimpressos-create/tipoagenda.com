import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface MonthlyRevenueDataPoint {
  date: string; // Ex: 'YYYY-MM-DD'
  revenue: number;
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueDataPoint[];
}

const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({ data }) => {
  // Formata os dados para garantir que todas as datas do mês estejam presentes, mesmo que sem faturamento.
  // Isso evita lacunas no gráfico e garante um eixo X contínuo.
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const formattedData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(currentYear, currentMonth, day);
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const existingData = data.find(d => d.date === formattedDate);
    return { date: formattedDate, revenue: existingData ? existingData.revenue : 0 };
  });

  // Ajusta o formato da data para exibição no eixo X (ex: DD/MM)
  const chartData = formattedData.map(d => ({
    ...d,
    displayDate: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="displayDate" />
        <YAxis />
        <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#8884d8" activeDot={{ r: 8 }} name="Faturamento" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MonthlyRevenueChart;

