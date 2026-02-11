-- =====================================================
-- CORRIGIR USER_ID E QUEUE_ID DO PROVEDOR
-- =====================================================
-- Erro: ERR_NO_USER_FOUND - userId não encontrado na LiotPRO
-- =====================================================

-- 1. Verificar valores atuais
SELECT 
    id,
    name,
    user_id,
    queue_id,
    LEFT(auth_token, 30) || '...' as auth_token_preview
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- 2. ATUALIZAR USER_ID E QUEUE_ID
-- =====================================================
-- ⚠️ IMPORTANTE: Substitua os valores abaixo pelos corretos da sua conta LiotPRO
-- =====================================================
-- Você pode encontrar esses valores no painel da LiotPRO:
-- - ID do Usuário/Atendente
-- - ID da Fila
-- =====================================================

-- Exemplo (substitua pelos valores corretos):
-- UPDATE public.messaging_providers
-- SET user_id = 'SEU_USER_ID_CORRETO',
--     queue_id = 'SEU_QUEUE_ID_CORRETO'
-- WHERE channel = 'WHATSAPP' 
--   AND is_active = true;

-- =====================================================
-- 3. VERIFICAR APÓS ATUALIZAÇÃO
-- =====================================================
-- SELECT 
--     id,
--     name,
--     user_id,
--     queue_id
-- FROM messaging_providers
-- WHERE channel = 'WHATSAPP' 
--   AND is_active = true;
-- =====================================================

