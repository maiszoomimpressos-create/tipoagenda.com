-- =====================================================
-- VERIFICAR TOKEN ATUAL NO BANCO
-- =====================================================

SELECT 
    id,
    name,
    auth_key,
    auth_token,  -- Mostrar token completo para verificar
    LEFT(auth_token, 30) || '...' as auth_token_preview,
    is_active,
    user_id,
    queue_id
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- Se o token estiver errado, execute:
-- UPDATE public.messaging_providers
-- SET auth_token = 'Bearer qRd4LimWs4pl0tGQvIAtzgG5XSvKRR'
-- WHERE channel = 'WHATSAPP' AND is_active = true;
-- =====================================================

