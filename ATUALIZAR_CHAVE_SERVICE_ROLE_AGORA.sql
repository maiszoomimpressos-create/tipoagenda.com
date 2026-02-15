-- =====================================================
-- ATUALIZAR SERVICE_ROLE_KEY PARA CORRIGIR AUTENTICAÇÃO
-- =====================================================
-- Este script atualiza a chave na tabela app_config para corresponder
-- à chave configurada nas Secrets da Edge Function
-- =====================================================

-- 1. Verificar chave atual na tabela app_config
SELECT 
    '=== CHAVE ATUAL ===' as secao,
    key,
    CASE 
        WHEN value IS NOT NULL AND value != '' 
        THEN '✅ CONFIGURADA (tamanho: ' || length(value) || ' caracteres)'
        ELSE '❌ NÃO CONFIGURADA'
    END as status,
    LEFT(value, 30) || '...' as preview_chave,
    updated_at
FROM public.app_config
WHERE key = 'service_role_key';

-- 2. Atualizar a chave na tabela app_config
INSERT INTO public.app_config (key, value, description, updated_by)
VALUES (
    'service_role_key', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3lpdWt0cm1jcXhrYmp4cW9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0NjEwOCwiZXhwIjoyMDgwNTIyMTA4fQ.cFdRLRvUmiFTDB15MvWoenOcpseshv8Ty9U1FLRU9IY',
    'Service Role Key para autenticação do cron job com Edge Functions',
    'system'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, 
    updated_at = NOW(),
    updated_by = 'system';

-- 3. Verificar se foi atualizada corretamente
SELECT 
    '=== CHAVE ATUALIZADA ===' as secao,
    key,
    CASE 
        WHEN value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3lpdWt0cm1jcXhrYmp4cW9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0NjEwOCwiZXhwIjoyMDgwNTIyMTA4fQ.cFdRLRvUmiFTDB15MvWoenOcpseshv8Ty9U1FLRU9IY'
        THEN '✅ CHAVE CORRETA (corresponde à chave fornecida)'
        ELSE '❌ CHAVE DIFERENTE'
    END as status_validacao,
    length(value) as tamanho_chave,
    updated_at
FROM public.app_config
WHERE key = 'service_role_key';

-- 4. Testar a função get_service_role_key()
SELECT 
    '=== TESTE DA FUNÇÃO ===' as secao,
    CASE 
        WHEN get_service_role_key() = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3lpdWt0cm1jcXhrYmp4cW9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0NjEwOCwiZXhwIjoyMDgwNTIyMTA4fQ.cFdRLRvUmiFTDB15MvWoenOcpseshv8Ty9U1FLRU9IY'
        THEN '✅ FUNÇÃO RETORNA CHAVE CORRETA'
        ELSE '❌ FUNÇÃO RETORNA CHAVE DIFERENTE'
    END as status_funcao,
    length(get_service_role_key()) as tamanho_retornado
FROM (SELECT 1) as dummy;

-- 5. IMPORTANTE: Verificar se a chave está configurada nas Secrets da Edge Function
-- Acesse: Supabase Dashboard > Edge Functions > whatsapp-message-scheduler > Settings > Secrets
-- Verifique se existe: SUPABASE_SERVICE_ROLE_KEY com o mesmo valor acima
-- Se não existir ou estiver diferente, adicione/atualize manualmente no Dashboard

SELECT 
    '=== PRÓXIMOS PASSOS ===' as secao,
    '1. Verifique se a chave está configurada nas Secrets da Edge Function' as passo_1,
    '   Dashboard > Edge Functions > whatsapp-message-scheduler > Settings > Secrets' as onde_verificar,
    '2. Se não estiver, adicione: SUPABASE_SERVICE_ROLE_KEY = [chave acima]' as passo_2,
    '3. Faça o deploy da Edge Function com o código atualizado' as passo_3
FROM (SELECT 1) as dummy;



