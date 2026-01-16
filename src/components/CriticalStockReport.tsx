import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CriticalProduct {
  id: string;
  name: string;
  quantity: number;
  min_stock: number;
}

interface CriticalStockReportProps {
  products: CriticalProduct[];
}

const CriticalStockReport: React.FC<CriticalStockReportProps> = ({ products }) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-xl"></i>
          Estoque Crítico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-gray-600 text-center p-4">Nenhum produto em estoque crítico. Ótimo!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Produto</TableHead>
                <TableHead>Atual</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="text-red-700">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>{product.min_stock}</TableCell>
                  <TableCell>
                    <a href={`/estoque/edit/${product.id}`} className="text-blue-600 hover:underline">
                      Reabastecer
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CriticalStockReport;

