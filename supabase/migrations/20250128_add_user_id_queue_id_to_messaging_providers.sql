-- =====================================================
-- Adicionar campos user_id e queue_id ao provedor
-- =====================================================
-- Campos obrigatórios para envio de mensagens via API
-- =====================================================

-- Adicionar colunas user_id e queue_id
ALTER TABLE public.messaging_providers 
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS queue_id TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.messaging_providers.user_id IS 
'ID do usuário/atendente para envio de mensagens via API. Campo obrigatório para alguns provedores.';

COMMENT ON COLUMN public.messaging_providers.queue_id IS 
'ID da fila para envio de mensagens via API. Campo obrigatório para alguns provedores.';

