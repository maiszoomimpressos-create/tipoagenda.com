import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { isPeriodClosed } from '@/utils/cash-closure-utils';

interface RegisterProductSaleParams {
  companyId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  paymentMethod: string;
  observations?: string;
}

export const registerProductSale = async ({
  companyId,
  productId,
  quantity,
  unitPrice,
  paymentMethod,
  observations,
}: RegisterProductSaleParams): Promise<{ success: boolean; error: string | null }> => {
  if (quantity <= 0) {
    return { success: false, error: "A quantidade vendida deve ser maior que zero." };
  }

  const totalAmount = quantity * unitPrice;

  try {
    // 1. Verificar se o período está fechado
    const transactionDate = new Date();
    const closed = await isPeriodClosed(companyId, transactionDate);
    
    if (closed) {
      return { success: false, error: 'Não é possível registrar vendas em períodos já fechados. O período atual está fechado.' };
    }

    // 2. Obter o produto e verificar o estoque
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('name, quantity')
      .eq('id', productId)
      .eq('company_id', companyId)
      .single();

    if (productError) throw new Error(productError.message);
    if (!productData) throw new Error("Produto não encontrado.");

    if (productData.quantity < quantity) {
      return { success: false, error: `Estoque insuficiente para ${productData.name}. Disponível: ${productData.quantity}.` };
    }

    // 3. Atualizar o estoque do produto
    const newQuantity = productData.quantity - quantity;
    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', productId)
      .eq('company_id', companyId);

    if (updateError) throw new Error(updateError.message);

    // 4. Registrar o movimento de caixa
    const { error: cashMovementError } = await supabase
      .from('cash_movements')
      .insert({
        company_id: companyId,
        transaction_type: 'venda_avulsa_produto',
        total_amount: totalAmount,
        transaction_date: new Date().toISOString(),
        payment_method: paymentMethod,
        observations: observations || `Venda avulsa de ${quantity}x ${productData.name}`,
        product_id: productId,
        quantity_sold: quantity,
        unit_price: unitPrice,
      });

    if (cashMovementError) throw new Error(cashMovementError.message);

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Erro ao registrar venda de produto:", error);
    showError("Falha ao registrar venda: " + error.message);
    return { success: false, error: error.message };
  }
};

