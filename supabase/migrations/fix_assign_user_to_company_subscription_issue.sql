-- =====================================================
-- Script de Investigação e Correção: Problema de Plano sendo Deletado ao Salvar Colaborador
-- =====================================================
-- 
-- Este script:
-- 1. Verifica a função assign_user_to_company atual
-- 2. Verifica triggers que possam afetar company_subscriptions
-- 3. Cria uma versão segura da função que NÃO mexe em planos
-- =====================================================

-- =====================================================
-- PARTE 1: INVESTIGAÇÃO
-- =====================================================

-- 1.1 Verificar se a função assign_user_to_company existe e ver sua definição
-- Execute no Supabase SQL Editor para ver a definição atual:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'assign_user_to_company';

-- 1.2 Verificar triggers em company_subscriptions
-- SELECT 
--   trigger_name, 
--   event_manipulation, 
--   event_object_table,
--   action_statement
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'company_subscriptions';

-- 1.3 Verificar triggers em user_companies que possam afetar subscriptions
-- SELECT 
--   trigger_name, 
--   event_manipulation, 
--   event_object_table,
--   action_statement
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'user_companies';

-- 1.4 Verificar triggers em collaborators que possam afetar subscriptions
-- SELECT 
--   trigger_name, 
--   event_manipulation, 
--   event_object_table,
--   action_statement
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'collaborators';

-- =====================================================
-- PARTE 2: CORREÇÃO - Função assign_user_to_company SEGURA
-- =====================================================
-- Esta versão GARANTE que NUNCA mexe em company_subscriptions

CREATE OR REPLACE FUNCTION public.assign_user_to_company(
  p_user_id UUID,
  p_company_id UUID,
  p_role_type_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_record_id UUID;
BEGIN
  -- Verificar se já existe um registro para este user_id e company_id
  SELECT id INTO v_existing_record_id
  FROM public.user_companies
  WHERE user_id = p_user_id
    AND company_id = p_company_id
  LIMIT 1;

  IF v_existing_record_id IS NOT NULL THEN
    -- Atualizar registro existente
    UPDATE public.user_companies
    SET 
      role_type = p_role_type_id,
      updated_at = NOW()
    WHERE id = v_existing_record_id;
  ELSE
    -- Criar novo registro
    INSERT INTO public.user_companies (
      user_id,
      company_id,
      role_type,
      is_primary,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_company_id,
      p_role_type_id,
      false, -- Não definir como primária automaticamente
      NOW(),
      NOW()
    );
  END IF;

  -- IMPORTANTE: Esta função NÃO faz NADA relacionado a company_subscriptions
  -- Ela apenas gerencia a relação user_companies
  -- Nenhuma lógica de plano/assinatura deve estar aqui

END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.assign_user_to_company(UUID, UUID, INTEGER) IS 
'Função segura para associar usuário a empresa. NÃO mexe em company_subscriptions. Apenas gerencia user_companies.';

-- =====================================================
-- PARTE 3: VERIFICAÇÃO DE INTEGRIDADE
-- =====================================================
-- Garantir que não há triggers deletando company_subscriptions

-- Remover qualquer trigger problemático em company_subscriptions que possa deletar registros
-- (Execute apenas se encontrar triggers problemáticos na investigação acima)

-- Exemplo de remoção de trigger problemático (descomente apenas se necessário):
-- DROP TRIGGER IF EXISTS trigger_name_here ON public.company_subscriptions;

-- =====================================================
-- PARTE 4: POLÍTICA DE SEGURANÇA
-- =====================================================
-- Garantir que apenas usuários autorizados possam deletar company_subscriptions

-- Verificar se há RLS habilitado em company_subscriptions
-- ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Criar política que impede deleção acidental (ajuste conforme necessário)
-- CREATE POLICY "prevent_accidental_deletion" ON public.company_subscriptions
--   FOR DELETE
--   USING (false); -- Bloqueia todas as deleções diretas via RLS
--   -- Ajuste esta política conforme suas regras de negócio

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- 
-- INSTRUÇÕES:
-- 1. Execute a PARTE 1 (investigação) primeiro no Supabase SQL Editor
-- 2. Analise os resultados para identificar triggers problemáticos
-- 3. Execute a PARTE 2 para substituir a função por versão segura
-- 4. Se necessário, execute PARTE 3 e 4 para proteções adicionais
-- =====================================================

