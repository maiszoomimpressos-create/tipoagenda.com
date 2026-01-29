-- =====================================================
-- ATUALIZAR TOKEN DO PROVEDOR WHATSAPP
-- =====================================================
-- Este script atualiza o token de autenticação do provedor ativo
-- =====================================================

-- Atualizar token COM prefixo "Bearer " (requerido pela API LiotPRO)
UPDATE public.messaging_providers
SET auth_token = 'Bearer QcKaszk1SaaeGIp3K6pP2HGfSItrAL'
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- Verificar se foi atualizado
SELECT 
    id,
    name,
    auth_key,
    auth_token,
    is_active,
    updated_at
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- =====================================================
-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- =====================================================

