-- =====================================================
-- CORRIGIR RLS: PERMITIR LEITURA PÚBLICA
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- Para permitir que a página de convidado (sem autenticação)
-- possa consultar os serviços de um colaborador
-- =====================================================

-- Remover política se já existir
DROP POLICY IF EXISTS "anon_can_view_collaborator_services" ON public.collaborator_services;

-- Política para SELECT: Permitir leitura pública (anon) de collaborator_services
-- Apenas para consultar serviços ativos de colaboradores
CREATE POLICY "anon_can_view_collaborator_services" 
ON public.collaborator_services
FOR SELECT
TO anon
USING (
  -- Permitir consulta apenas de registros ativos
  active = true
  -- E apenas se o colaborador e serviço pertencem à mesma empresa
  AND EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.id = collaborator_services.collaborator_id
      AND c.company_id = collaborator_services.company_id
      AND c.is_active = true
  )
  AND EXISTS (
    SELECT 1 
    FROM public.services s
    WHERE s.id = collaborator_services.service_id
      AND s.company_id = collaborator_services.company_id
      AND s.is_active = true
  )
);

-- Verificar se a política foi criada
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'collaborator_services'
  AND policyname = 'anon_can_view_collaborator_services';

-- =====================================================
-- FIM
-- =====================================================
