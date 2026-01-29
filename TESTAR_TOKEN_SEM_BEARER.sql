-- =====================================================
-- TESTAR TOKEN SEM PREFIXO "Bearer "
-- =====================================================
-- Algumas APIs não precisam do prefixo "Bearer "
-- =====================================================

-- Atualizar token SEM prefixo "Bearer "
UPDATE public.messaging_providers
SET auth_token = 'DvO5QtR6BTQvvP8wf87vFwB1yq77K0'
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- Verificar se foi atualizado
SELECT 
    id,
    name,
    auth_key,
    LEFT(auth_token, 20) || '...' as auth_token_preview,
    is_active
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

