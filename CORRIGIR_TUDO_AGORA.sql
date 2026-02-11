-- =====================================================
-- CORREÇÃO COMPLETA - URL E TOKEN
-- =====================================================

-- 1. CORRIGIR URL (deve ser liotteste.liotpro.online, não api.liotpro.com.br)
UPDATE public.messaging_providers
SET base_url = 'https://liotteste.liotpro.online/api/messages/send'
WHERE channel = 'WHATSAPP' 
  AND is_active = true
  AND base_url != 'https://liotteste.liotpro.online/api/messages/send';

-- 2. GARANTIR QUE TOKEN TEM "Bearer " (se não tiver, adicionar)
UPDATE public.messaging_providers
SET auth_token = CASE 
    WHEN auth_token NOT LIKE 'Bearer %' THEN 'Bearer ' || auth_token
    ELSE auth_token
END
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- 3. VERIFICAR CONFIGURAÇÃO FINAL
SELECT 
    id,
    name,
    base_url,
    http_method,
    auth_key,
    LEFT(auth_token, 40) || '...' as auth_token_preview,
    user_id,
    queue_id,
    is_active
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

