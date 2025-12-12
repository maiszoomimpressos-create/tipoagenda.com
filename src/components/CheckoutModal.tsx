import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { PlusCircle, MinusCircle, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number; // Current stock quantity
}

interface Service {
  name: string;
  price: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | null;
  companyId: string;
  onCheckoutComplete: () => void;
}

interface AppointmentDetails {
  total_price: number;
  total_duration_minutes: number;
  status: string;
  client_nickname: string | null;
  clients: { name: string } | null;
  collaborators: { first_name: string; last_name: string } | null;
  appointment_services: { services: Service | null }[];
}

interface ProductSale {
  id: string; // Product ID
  name: string;
  unit_price: number;
  quantity: number;
  stock_quantity: number; // For validation
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  companyId,
  onCheckoutComplete,
}) => {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productsSold, setProductsSold] = useState<ProductSale[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [observations, setObservations] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!appointmentId || !companyId) return;

    setDetailsLoading(true);
    try {
      // 1. Fetch Appointment Details
      const { data: appData, error: appError } = await supabase
        .from('appointments')
        .select(`
          total_price,
          total_duration_minutes,
          status,
          client_nickname,
          clients(name),
          collaborators(first_name, last_name),
          appointment_services(
            services(name, price)
          )
        `)
        .eq('id', appointmentId)
        .eq('company_id', companyId)
        .single();

      if (appError) throw appError;
      setAppointmentDetails(appData as AppointmentDetails);

      // 2. Fetch Available Products (in stock)
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('id, name, price, quantity')
        .eq('company_id', companyId)
        .gt('quantity', 0) // Only show products currently in stock
        .order('name', { ascending: true });

      if (prodError) throw prodError;
      setAvailableProducts(prodData as Product[]);

    } catch (error: any) {
      console.error('Erro ao carregar detalhes do checkout:', error);
      showError('Erro ao carregar detalhes do agendamento: ' + error.message);
      onClose();
    } finally {
      setDetailsLoading(false);
    }
  }, [appointmentId, companyId, onClose]);

  useEffect(() => {
    if (isOpen) {
      setProductsSold([]);
      setPaymentMethod('dinheiro');
      setObservations('');
      setSelectedProductId(null);
      fetchDetails();
    }
  }, [isOpen, fetchDetails]);

  const handleAddProduct = () => {
    if (!selectedProductId) return;

    const product = availableProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingSaleIndex = productsSold.findIndex(p => p.id === selectedProductId);

    if (existingSaleIndex !== -1) {
      // If product already added, increment quantity if stock allows
      const updatedSales = [...productsSold];
      if (updatedSales[existingSaleIndex].quantity < product.quantity) {
        updatedSales[existingSaleIndex].quantity += 1;
        setProductsSold(updatedSales);
      } else {
        showError(`Estoque máximo de ${product.quantity} atingido para ${product.name}.`);
      }
    } else {
      // Add new product sale
      setProductsSold([...productsSold, {
        id: product.id,
        name: product.name,
        unit_price: product.price,
        quantity: 1,
        stock_quantity: product.quantity,
      }]);
    }
    setSelectedProductId(null); // Reset selection
  };

  const handleUpdateProductQuantity = (productId: string, delta: number) => {
    setProductsSold(prevSales => {
      const updatedSales = prevSales.map(sale => {
        if (sale.id === productId) {
          const newQuantity = sale.quantity + delta;
          if (newQuantity > sale.stock_quantity) {
            showError(`Estoque máximo de ${sale.stock_quantity} atingido para ${sale.name}.`);
            return sale;
          }
          if (newQuantity < 1) {
            return null; // Mark for removal
          }
          return { ...sale, quantity: newQuantity };
        }
        return sale;
      }).filter(Boolean) as ProductSale[]; // Remove nulls (products with quantity < 1)
      return updatedSales;
    });
  };

  const totalProductsPrice = productsSold.reduce((sum, p) => sum + (p.unit_price * p.quantity), 0);
  const totalServicesPrice = appointmentDetails?.total_price || 0;
  const grandTotal = totalServicesPrice + totalProductsPrice;

  const handleFinalize = async () => {
    if (!appointmentId || !companyId || !session?.user || !appointmentDetails) {
      showError('Erro: Dados incompletos para finalizar o checkout.');
      return;
    }
    if (appointmentDetails.status === 'concluido') {
      showError('Este agendamento já foi concluído.');
      return;
    }

    setLoading(true);
    try {
      // 1. Update Appointment Status to 'concluido'
      const { error: appUpdateError } = await supabase
        .from('appointments')
        .update({ status: 'concluido' })
        .eq('id', appointmentId)
        .eq('company_id', companyId);

      if (appUpdateError) throw appUpdateError;

      // 2. Insert Transaction into caixa_movimentacoes
      const { data: transactionData, error: transactionError } = await supabase
        .from('caixa_movimentacoes')
        .insert({
          company_id: companyId,
          appointment_id: appointmentId,
          user_id: session.user.id,
          total_amount: grandTotal,
          payment_method: paymentMethod,
          transaction_type: 'recebimento',
          observations: observations,
        })
        .select('id')
        .single();

      if (transactionError) throw transactionError;
      const transactionId = transactionData.id;

      // 3. Insert Products Sold into transacao_produtos and update inventory
      if (productsSold.length > 0) {
        const transactionProductsToInsert = productsSold.map(p => ({
          transaction_id: transactionId,
          product_id: p.id,
          quantity: p.quantity,
          unit_price: p.unit_price,
        }));

        const { error: prodInsertError } = await supabase
          .from('transacao_produtos')
          .insert(transactionProductsToInsert);

        if (prodInsertError) throw prodInsertError;

        // 4. Update Product Inventory (Decrement quantity)
        for (const product of productsSold) {
          const newQuantity = product.stock_quantity - product.quantity;
          const { error: inventoryUpdateError } = await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', product.id)
            .eq('company_id', companyId);
          
          if (inventoryUpdateError) {
            console.warn(`Falha ao atualizar estoque para o produto ${product.name}: ${inventoryUpdateError.message}`);
            // We proceed even if inventory update fails, as the transaction is recorded.
          }
        }
      }

      showSuccess('Checkout concluído e transação registrada com sucesso!');
      onCheckoutComplete();
      onClose();
    } catch (error: any) {
      console.error('Erro durante o checkout:', error);
      showError('Erro ao finalizar o checkout: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clientDisplay = appointmentDetails?.client_nickname || appointmentDetails?.clients?.name || 'Cliente Desconhecido';
  const collaboratorName = appointmentDetails?.collaborators ? `${appointmentDetails.collaborators.first_name} ${appointmentDetails.collaborators.last_name}` : 'Colaborador Desconhecido';

  if (detailsLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="p-8 text-center">Carregando detalhes do agendamento...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!appointmentDetails) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Checkout do Agendamento</DialogTitle>
          <DialogDescription>
            Finalize a venda para {clientDisplay} (Colaborador: {collaboratorName}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Detalhes do Serviço */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900">Serviços Agendados</h3>
            {appointmentDetails.appointment_services.map((as, index) => (
              <div key={index} className="flex justify-between text-sm text-gray-700">
                <span>{as.services?.name || 'Serviço Removido'}</span>
                <span className="font-medium">R$ {as.services?.price?.toFixed(2).replace('.', ',') || '0,00'}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total Serviços:</span>
              <span>R$ {totalServicesPrice.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {/* Adicionar Produtos */}
          <div className="space-y-3 border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900">Produtos Adicionais</h3>
            <div className="flex gap-2">
              <Select onValueChange={setSelectedProductId} value={selectedProductId || ''}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Adicionar Produto (Estoque: > 0)" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.length === 0 ? (
                    <SelectItem value="no-stock" disabled>Nenhum produto em estoque.</SelectItem>
                  ) : (
                    availableProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (R$ {p.price.toFixed(2).replace('.', ',')} | Estoque: {p.quantity})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleAddProduct} disabled={!selectedProductId} className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de Produtos Vendidos */}
            <div className="space-y-2 pt-2">
              {productsSold.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">R$ {p.unit_price.toFixed(2).replace('.', ',')}</span>
                    <div className="flex items-center border rounded-md">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateProductQuantity(p.id, -1)}>
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-semibold w-6 text-center">{p.quantity}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateProductQuantity(p.id, 1)}>
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="font-bold text-gray-900 w-16 text-right">R$ {(p.unit_price * p.quantity).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total Produtos:</span>
              <span>R$ {totalProductsPrice.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {/* Resumo e Pagamento */}
          <div className="space-y-4">
            <div className="bg-yellow-50 p-3 rounded-lg flex justify-between font-extrabold text-xl text-gray-900 border border-yellow-200">
              <span>TOTAL A PAGAR:</span>
              <span>R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
            </div>

            <div>
              <Label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Forma de Pagamento *
              </Label>
              <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão (Crédito/Débito)</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-2">
                Observações (Opcional)
              </Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Adicione observações sobre o pagamento ou cliente..."
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="!rounded-button whitespace-nowrap"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleFinalize}
            disabled={loading || grandTotal <= 0}
            className="!rounded-button whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Finalizando...' : `Finalizar Venda (R$ ${grandTotal.toFixed(2).replace('.', ',')})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;