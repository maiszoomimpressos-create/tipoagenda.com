-- =====================================================
-- ATUALIZAR TOKEN DO PROVEDOR WHATSAPP (NOVO)
-- =====================================================
-- Token: qRd4LimWs4pl0tGQvIAtzgG5XSvKRR
-- =====================================================

-- Atualizar token COM prefixo "Bearer " (requerido pela API LiotPRO)
UPDATE public.messaging_providers
SET auth_token = 'Bearer qRd4LimWs4pl0tGQvIAtzgG5XSvKRR'
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- Verificar se foi atualizado
SELECT 
    id,
    name,
    auth_key,
    LEFT(auth_token, 30) || '...' as auth_token_preview,
    is_active,
    user_id,
    queue_id
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- =====================================================

