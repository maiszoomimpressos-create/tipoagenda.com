-- =====================================================
-- CORREÇÃO: Políticas RLS para tabela `collaborator_services`
-- =====================================================
-- Garantir que usuários possam gerenciar vínculos de colaborador-serviço
-- de empresas onde eles têm um papel (user_companies)
-- =====================================================

-- Habilitar RLS na tabela `collaborator_services` se não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'collaborator_services'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.collaborator_services ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Remover políticas antigas que possam estar bloqueando
DROP POLICY IF EXISTS "users_can_view_collaborator_services" ON public.collaborator_services;
DROP POLICY IF EXISTS "users_can_manage_collaborator_services" ON public.collaborator_services;
DROP POLICY IF EXISTS "authenticated_users_can_view_collaborator_services" ON public.collaborator_services;
DROP POLICY IF EXISTS "authenticated_users_can_insert_collaborator_services" ON public.collaborator_services;
DROP POLICY IF EXISTS "authenticated_users_can_update_collaborator_services" ON public.collaborator_services;
DROP POLICY IF EXISTS "authenticated_users_can_delete_collaborator_services" ON public.collaborator_services;

-- Política para SELECT: Usuários podem ver vínculos de colaborador-serviço de suas empresas
CREATE POLICY "authenticated_users_can_view_collaborator_services" 
ON public.collaborator_services
FOR SELECT
TO authenticated
USING (
  -- Verificar se o usuário tem um papel na empresa do vínculo
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = collaborator_services.company_id
      AND uc.user_id = auth.uid()
  )
);

-- Política para INSERT: Usuários podem criar vínculos de colaborador-serviço para colaboradores de suas empresas
CREATE POLICY "authenticated_users_can_insert_collaborator_services" 
ON public.collaborator_services
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar se o usuário tem um papel na empresa do vínculo
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = collaborator_services.company_id
      AND uc.user_id = auth.uid()
  )
  -- Verificar se o colaborador pertence à mesma empresa
  AND EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.id = collaborator_services.collaborator_id
      AND c.company_id = collaborator_services.company_id
  )
  -- Verificar se o serviço pertence à mesma empresa
  AND EXISTS (
    SELECT 1 
    FROM public.services s
    WHERE s.id = collaborator_services.service_id
      AND s.company_id = collaborator_services.company_id
  )
);

-- Política para UPDATE: Usuários podem atualizar vínculos de colaborador-serviço de suas empresas
CREATE POLICY "authenticated_users_can_update_collaborator_services" 
ON public.collaborator_services
FOR UPDATE
TO authenticated
USING (
  -- Verificar se o usuário tem um papel na empresa do vínculo
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = collaborator_services.company_id
      AND uc.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Verificar se o usuário tem um papel na empresa do vínculo (após atualização)
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = collaborator_services.company_id
      AND uc.user_id = auth.uid()
  )
  -- Verificar se o colaborador pertence à mesma empresa (após atualização)
  AND EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.id = collaborator_services.collaborator_id
      AND c.company_id = collaborator_services.company_id
  )
  -- Verificar se o serviço pertence à mesma empresa (após atualização)
  AND EXISTS (
    SELECT 1 
    FROM public.services s
    WHERE s.id = collaborator_services.service_id
      AND s.company_id = collaborator_services.company_id
  )
);

-- Política para DELETE: Usuários podem deletar vínculos de colaborador-serviço de suas empresas
-- (Embora normalmente usamos o campo 'active' para desativar, permitimos DELETE para casos especiais)
CREATE POLICY "authenticated_users_can_delete_collaborator_services" 
ON public.collaborator_services
FOR DELETE
TO authenticated
USING (
  -- Verificar se o usuário tem um papel na empresa do vínculo
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = collaborator_services.company_id
      AND uc.user_id = auth.uid()
  )
);

-- =====================================================
-- FIM DA CORREÇÃO RLS para `collaborator_services`
-- =====================================================

