-- =====================================================
-- Criação da tabela commission_payments
-- =====================================================
-- Tabela para rastrear pagamentos de comissões aos colaboradores
-- Suporta pagamentos parciais e em lote
-- =====================================================

-- Criar tabela commission_payments
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_movement_id uuid NOT NULL REFERENCES public.cash_movements(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  amount_paid numeric(10,2) NOT NULL CHECK (amount_paid > 0),
  payment_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'transferencia', 'cartao')),
  observations text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: Não permitir pagamento maior que o valor da comissão original
  -- (verificado via trigger ou aplicação)
  CONSTRAINT valid_payment_amount CHECK (amount_paid > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_commission_payments_company ON public.commission_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_collaborator ON public.commission_payments(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_cash_movement ON public.commission_payments(cash_movement_id);
CREATE INDEX IF NOT EXISTS idx_commission_payments_payment_date ON public.commission_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_commission_payments_user ON public.commission_payments(user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_commission_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commission_payments_updated_at ON public.commission_payments;
CREATE TRIGGER trg_commission_payments_updated_at
BEFORE UPDATE ON public.commission_payments
FOR EACH ROW
EXECUTE FUNCTION public.set_commission_payments_updated_at();

-- Habilitar RLS
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários podem ver pagamentos de comissões de suas empresas
DROP POLICY IF EXISTS "authenticated_users_can_view_commission_payments" ON public.commission_payments;
CREATE POLICY "authenticated_users_can_view_commission_payments"
ON public.commission_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = commission_payments.company_id
      AND uc.user_id = auth.uid()
  )
);

-- Política RLS: Usuários podem criar pagamentos de comissões para suas empresas
DROP POLICY IF EXISTS "authenticated_users_can_insert_commission_payments" ON public.commission_payments;
CREATE POLICY "authenticated_users_can_insert_commission_payments"
ON public.commission_payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = commission_payments.company_id
      AND uc.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Política RLS: Usuários podem atualizar pagamentos de comissões de suas empresas
DROP POLICY IF EXISTS "authenticated_users_can_update_commission_payments" ON public.commission_payments;
CREATE POLICY "authenticated_users_can_update_commission_payments"
ON public.commission_payments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = commission_payments.company_id
      AND uc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = commission_payments.company_id
      AND uc.user_id = auth.uid()
  )
);

-- Comentários para documentação
COMMENT ON TABLE public.commission_payments IS 'Rastreia pagamentos de comissões aos colaboradores, suportando pagamentos parciais';
COMMENT ON COLUMN public.commission_payments.cash_movement_id IS 'Referência à comissão original em cash_movements';
COMMENT ON COLUMN public.commission_payments.amount_paid IS 'Valor pago (pode ser parcial)';
COMMENT ON COLUMN public.commission_payments.payment_date IS 'Data em que o pagamento foi efetuado';
COMMENT ON COLUMN public.commission_payments.payment_method IS 'Método de pagamento: dinheiro, pix, transferencia, cartao';


