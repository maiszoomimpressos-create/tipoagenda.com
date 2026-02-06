-- Adicionar campo plan_id na tabela admin_coupons para vincular cupons a planos específicos
-- Se plan_id for NULL, o cupom é válido para todos os planos (comportamento atual)

ALTER TABLE public.admin_coupons
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.admin_coupons.plan_id IS 'ID do plano ao qual o cupom é válido. NULL = válido para todos os planos';

