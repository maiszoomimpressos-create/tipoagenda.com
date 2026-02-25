-- =====================================================
-- CORRIGIR RLS: PERMITIR QUE QUALQUER USUÁRIO AUTENTICADO
-- LEIA OS SERVIÇOS VINCULADOS A UM COLABORADOR
-- (USO EM /agendar/:companyId)
-- =====================================================
-- Execute este SQL no Supabase SQL Editor (banco Primary)
-- =====================================================

-- Política existente (de migração) exige vínculo em user_companies.
-- Isso faz sentido para painel interno, mas BLOQUEIA clientes que
-- acessam via link /agendar/:companyId.
--
-- Em vez de remover essa política, vamos adicionar outra política
-- de SELECT para o mesmo papel (authenticated). As políticas são
-- AVALIADAS EM OR, então se QUALQUER uma for verdadeira, o registro
-- é visível.

-- 1. Remover política antiga de clientes (se já existir com mesmo nome)
DROP POLICY IF EXISTS "authenticated_clients_can_view_collaborator_services_any_company"
  ON public.collaborator_services;

-- 2. Criar política para permitir leitura a QUALQUER usuário autenticado
-- de vínculos ativos e consistentes (colaborador + serviço da mesma empresa).
CREATE POLICY "authenticated_clients_can_view_collaborator_services_any_company"
ON public.collaborator_services
FOR SELECT
TO authenticated
USING (
  -- Apenas vínculos ativos
  active = true

  -- Colaborador deve pertencer à mesma empresa e estar ativo
  AND EXISTS (
    SELECT 1
    FROM public.collaborators c
    WHERE c.id = collaborator_services.collaborator_id
      AND c.company_id = collaborator_services.company_id
      AND c.is_active = true
  )

  -- Serviço deve pertencer à mesma empresa e estar ativo
  AND EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = collaborator_services.service_id
      AND s.company_id = collaborator_services.company_id
      AND s.is_active = true
  )
);

-- 3. Conferir políticas ativas na tabela
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'collaborator_services';

-- =====================================================
-- FIM
-- =====================================================


























