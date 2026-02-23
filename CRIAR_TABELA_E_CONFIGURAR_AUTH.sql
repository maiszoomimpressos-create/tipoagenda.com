-- =====================================================
-- CRIAR TABELA worker_execution_logs E CONFIGURAR AUTENTICAÇÃO
-- =====================================================

-- 1. Criar tabela worker_execution_logs (se não existir)
CREATE TABLE IF NOT EXISTS public.worker_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'PARTIAL')),
    messages_processed INTEGER NOT NULL DEFAULT 0,
    messages_sent INTEGER NOT NULL DEFAULT 0,
    messages_failed INTEGER NOT NULL DEFAULT 0,
    execution_duration_ms INTEGER,
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_worker_execution_logs_execution_time 
ON public.worker_execution_logs(execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_worker_execution_logs_status 
ON public.worker_execution_logs(status);

-- RLS: Apenas service_role pode inserir logs
ALTER TABLE public.worker_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_can_insert_worker_logs" ON public.worker_execution_logs;
CREATE POLICY "service_role_can_insert_worker_logs" 
ON public.worker_execution_logs
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_can_view_worker_logs" ON public.worker_execution_logs;
CREATE POLICY "authenticated_can_view_worker_logs" 
ON public.worker_execution_logs
FOR SELECT
TO authenticated
USING (true);

-- 2. Criar tabela de configuração para service_role_key
-- Esta tabela armazena a chave de forma segura
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- RLS: Apenas service_role pode ler/escrever
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_config" ON public.app_config;
CREATE POLICY "service_role_full_access_config" 
ON public.app_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Permitir leitura para authenticated (mas não escrita)
DROP POLICY IF EXISTS "authenticated_can_read_config" ON public.app_config;
CREATE POLICY "authenticated_can_read_config" 
ON public.app_config
FOR SELECT
TO authenticated
USING (true);

-- 3. Atualizar função get_service_role_key() para ler da tabela
CREATE OR REPLACE FUNCTION get_service_role_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_key text;
BEGIN
    -- Primeiro tentar ler da tabela app_config
    SELECT value INTO v_key
    FROM public.app_config
    WHERE key = 'service_role_key'
    LIMIT 1;
    
    -- Se não encontrou na tabela, tentar current_setting
    IF v_key IS NULL OR v_key = '' THEN
        BEGIN
            v_key := current_setting('app.settings.service_role_key', true);
        EXCEPTION
            WHEN OTHERS THEN
                v_key := '';
        END;
    END IF;
    
    RETURN COALESCE(v_key, '');
END;
$$;

-- 4. INSTRUÇÕES: Inserir a service_role_key na tabela
-- Execute o comando abaixo substituindo 'SUA_SERVICE_ROLE_KEY_AQUI' pela chave real:
-- 
-- INSERT INTO public.app_config (key, value, description, updated_by)
-- VALUES ('service_role_key', 'SUA_SERVICE_ROLE_KEY_AQUI', 'Service Role Key para autenticação do cron job', 'system')
-- ON CONFLICT (key) DO UPDATE 
-- SET value = EXCLUDED.value, 
--     updated_at = NOW(),
--     updated_by = 'system';
--
-- OU execute o script CONFIGURAR_SERVICE_ROLE_KEY_TABELA.sql

-- 5. Verificar status
SELECT 
    '=== STATUS ===' as secao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.app_config WHERE key = 'service_role_key' AND value != '') 
        THEN '✅ Service role key configurada na tabela app_config'
        WHEN get_service_role_key() != '' 
        THEN '✅ Service role key configurada via current_setting'
        ELSE '❌ Service role key NÃO configurada'
    END as status_auth,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'worker_execution_logs')
        THEN '✅ Tabela worker_execution_logs existe'
        ELSE '❌ Tabela worker_execution_logs NÃO existe'
    END as status_tabela
FROM (SELECT 1) as dummy;















