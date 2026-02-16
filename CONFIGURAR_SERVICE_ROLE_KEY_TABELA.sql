-- =====================================================
-- CONFIGURAR SERVICE_ROLE_KEY NA TABELA app_config
-- =====================================================
-- IMPORTANTE: Substitua 'SUA_SERVICE_ROLE_KEY_AQUI' pela chave real
-- Você pode encontrar a chave em: Supabase Dashboard > Settings > API > service_role key
-- =====================================================

-- Inserir ou atualizar a service_role_key
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

-- Verificar se foi configurada
SELECT 
    '=== CONFIGURAÇÃO ===' as secao,
    key,
    CASE 
        WHEN value IS NOT NULL AND value != '' 
        THEN '✅ CONFIGURADA (tamanho: ' || length(value) || ' caracteres)'
        ELSE '❌ NÃO CONFIGURADA'
    END as status,
    updated_at
FROM public.app_config
WHERE key = 'service_role_key';

-- Testar a função
SELECT 
    '=== TESTE DA FUNÇÃO ===' as secao,
    CASE 
        WHEN get_service_role_key() IS NOT NULL AND get_service_role_key() != '' 
        THEN '✅ Função retorna chave (tamanho: ' || length(get_service_role_key()) || ' caracteres)'
        ELSE '❌ Função retorna vazio'
    END as status_funcao
FROM (SELECT 1) as dummy;





