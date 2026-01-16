import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { registerProductSale } from '@/lib/sales-utils';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number; // Estoque atual
}

interface SellProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSaleSuccess: () => void; // Callback para quando a venda for bem-sucedida (ex: para recarregar transações)
}

const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'Pix' },
];

export const SellProductModal: React.FC<SellProductModalProps> = ({
  isOpen,
  onClose,
  companyId,
  onSaleSuccess,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  useEffect(() => {
    if (!isOpen || !companyId) {
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, quantity')
          .eq('company_id', companyId)
          .gt('quantity', 0) // Apenas produtos com estoque > 0
          .order('name', { ascending: true });

        if (error) throw error;

        setProducts(data || []);
        if (data && data.length > 0) {
          setSelectedProductId(data[0].id); // Seleciona o primeiro produto por padrão
        } else {
          setSelectedProductId('');
        }
        setQuantity(1);
        setPaymentMethod(paymentMethods[0].value); // Seleciona o primeiro método de pagamento por padrão
        setObservations('');
      } catch (error: any) {
        console.error('Erro ao buscar produtos:', error);
        showError('Erro ao carregar produtos: ' + error.message);
        onClose(); // Fecha o modal em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [isOpen, companyId, onClose]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSale = async () => {
    if (!selectedProductId || !paymentMethod || quantity <= 0) {
      showError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    if (!selectedProduct) {
      showError('Produto selecionado inválido.');
      return;
    }
    if (quantity > selectedProduct.quantity) {
      showError(`Estoque insuficiente. Disponível: ${selectedProduct.quantity}`);
      return;
    }

    setIsProcessingSale(true);
    const { success, error } = await registerProductSale({
      companyId,
      productId: selectedProductId,
      quantity,
      unitPrice: selectedProduct.price,
      paymentMethod,
      observations,
    });

    if (success) {
      showSuccess('Venda de produto registrada com sucesso!');
      onSaleSuccess(); // Notifica o pai para recarregar dados
      onClose();
    } else {
      showError(error || 'Ocorreu um erro ao registrar a venda.');
    }
    setIsProcessingSale(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Venda Avulsa de Produto</DialogTitle>
          <DialogDescription>
            Preencha os detalhes para registrar a venda de um produto avulso e atualizar o estoque.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-8">Carregando produtos...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">Nenhum produto disponível para venda.</div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="product">Produto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product" className="w-full">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Estoque: {product.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
              {selectedProduct && quantity > selectedProduct.quantity && (
                <p className="text-red-500 text-sm mt-1">Estoque insuficiente! Disponível: {selectedProduct.quantity}</p>
              )}
            </div>

            <div>
              <Label htmlFor="price">Preço Total</Label>
              <Input
                id="price"
                type="text"
                value={`R$ ${((selectedProduct?.price || 0) * quantity).toFixed(2).replace('.', ',')}`}
                disabled
                className="font-bold"
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod" className="w-full">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observations">Observações (Opcional)</Label>
              <Input
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Adicione observações sobre a venda"
              />
            </div>

            <Button onClick={handleSale} className="w-full" disabled={isProcessingSale}>
              {isProcessingSale ? 'Processando...' : 'Registrar Venda'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>)
}