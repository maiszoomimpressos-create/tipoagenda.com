-- =====================================================
-- ATUALIZAR USER_ID E QUEUE_ID CORRETOS
-- =====================================================
-- Erro atual: ERR_NO_USER_FOUND - userId 184 não encontrado
-- =====================================================
-- INSTRUÇÕES:
-- 1. Acesse o painel da LiotPRO
-- 2. Encontre o ID do Usuário/Atendente correto
-- 3. Encontre o ID da Fila correto
-- 4. Substitua os valores abaixo e execute
-- =====================================================

-- Verificar valores atuais
SELECT 
    id,
    name,
    user_id as "User ID atual",
    queue_id as "Queue ID atual"
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- ATUALIZAR COM OS VALORES CORRETOS
-- =====================================================
-- ⚠️ SUBSTITUA 'SEU_USER_ID' e 'SEU_QUEUE_ID' pelos valores corretos do painel LiotPRO
-- =====================================================

UPDATE public.messaging_providers
SET user_id = 'SEU_USER_ID',      -- ⚠️ SUBSTITUA AQUI
    queue_id = 'SEU_QUEUE_ID'      -- ⚠️ SUBSTITUA AQUI
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- Verificar se foi atualizado
SELECT 
    id,
    name,
    user_id as "User ID atualizado",
    queue_id as "Queue ID atualizado"
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

