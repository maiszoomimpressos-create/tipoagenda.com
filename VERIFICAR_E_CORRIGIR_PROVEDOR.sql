-- =====================================================
-- VERIFICAR E CORRIGIR CONFIGURAÇÃO DO PROVEDOR
-- =====================================================
-- Baseado na documentação: https://liotteste.liotpro.online/api/messages/send
-- =====================================================

-- 1. Verificar configuração atual
SELECT 
    id,
    name,
    base_url,
    http_method,
    auth_key,
    LEFT(auth_token, 30) || '...' as auth_token_preview,
    payload_template,
    content_type,
    user_id,
    queue_id,
    is_active
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- 2. CORRIGIR URL BASE (se necessário)
-- =====================================================
-- A URL correta segundo a documentação é:
-- https://liotteste.liotpro.online/api/messages/send
-- =====================================================

UPDATE public.messaging_providers
SET base_url = 'https://liotteste.liotpro.online/api/messages/send'
WHERE channel = 'WHATSAPP' 
  AND is_active = true
  AND base_url != 'https://liotteste.liotpro.online/api/messages/send';

-- =====================================================
-- 3. CORRIGIR PAYLOAD TEMPLATE (se necessário)
-- =====================================================
-- Formato correto segundo a documentação:
-- {
--   "number": "558599999999",
--   "body": "Mensagem",
--   "userId": "ID do usuário ou \"\"",
--   "queueId": "ID da Fila ou \"\"",
--   "sendSignature": false,
--   "closeTicket": false,
--   "status": "pending"
-- }
-- =====================================================

UPDATE public.messaging_providers
SET payload_template = '{
  "number": "{phone}",
  "body": "{text}",
  "userId": "",
  "queueId": "",
  "sendSignature": false,
  "closeTicket": false,
  "status": "pending"
}'::jsonb
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- 4. GARANTIR QUE user_id E queue_id ESTÃO PREENCHIDOS
-- =====================================================
-- Se não estiverem preenchidos, usar valores padrão
-- =====================================================

UPDATE public.messaging_providers
SET user_id = COALESCE(user_id, '184'),
    queue_id = COALESCE(queue_id, '73')
WHERE channel = 'WHATSAPP' 
  AND is_active = true
  AND (user_id IS NULL OR queue_id IS NULL);

-- =====================================================
-- 5. VERIFICAR CONFIGURAÇÃO FINAL
-- =====================================================

SELECT 
    id,
    name,
    base_url,
    http_method,
    auth_key,
    LEFT(auth_token, 30) || '...' as auth_token_preview,
    payload_template,
    content_type,
    user_id,
    queue_id,
    is_active
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- IMPORTANTE: 
-- - O número de telefone deve ser enviado SEM o "+"
-- - Formato: "558599999999" (sem espaços, sem +)
-- - O sistema vai substituir {phone} pelo número formatado
-- =====================================================

