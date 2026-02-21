-- =====================================================
-- CORREÇÃO: Políticas RLS para tabela `services`
-- =====================================================
-- Permitir que colaboradores possam inserir, atualizar e visualizar
-- serviços da empresa onde trabalham
-- =====================================================

-- Habilitar RLS na tabela `services` se não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'services'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Remover políticas antigas que possam estar bloqueando
DROP POLICY IF EXISTS "users_can_view_services" ON public.services;
DROP POLICY IF EXISTS "users_can_insert_services" ON public.services;
DROP POLICY IF EXISTS "users_can_update_services" ON public.services;
DROP POLICY IF EXISTS "users_can_delete_services" ON public.services;
DROP POLICY IF EXISTS "authenticated_users_can_view_services" ON public.services;
DROP POLICY IF EXISTS "authenticated_users_can_insert_services" ON public.services;
DROP POLICY IF EXISTS "authenticated_users_can_update_services" ON public.services;
DROP POLICY IF EXISTS "authenticated_users_can_delete_services" ON public.services;
DROP POLICY IF EXISTS "proprietario_admin_can_manage_services" ON public.services;

-- Política para SELECT: Usuários podem ver serviços de empresas onde têm um papel
-- (user_companies) OU são colaboradores (collaborators)
CREATE POLICY "authenticated_users_can_view_services" 
ON public.services
FOR SELECT
TO authenticated
USING (
  -- Verificar se o usuário tem um papel na empresa (user_companies)
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = services.company_id
      AND uc.user_id = auth.uid()
  )
  -- OU se o usuário é colaborador da empresa
  OR EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.company_id = services.company_id
      AND c.user_id = auth.uid()
      AND c.is_active = true
  )
);

-- Política para INSERT: Usuários podem criar serviços em empresas onde têm um papel
-- (user_companies) OU são colaboradores (collaborators)
CREATE POLICY "authenticated_users_can_insert_services" 
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar se o usuário tem um papel na empresa (user_companies)
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = services.company_id
      AND uc.user_id = auth.uid()
  )
  -- OU se o usuário é colaborador da empresa
  OR EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.company_id = services.company_id
      AND c.user_id = auth.uid()
      AND c.is_active = true
  )
);

-- Política para UPDATE: Usuários podem atualizar serviços de empresas onde têm um papel
-- (user_companies) OU são colaboradores (collaborators)
CREATE POLICY "authenticated_users_can_update_services" 
ON public.services
FOR UPDATE
TO authenticated
USING (
  -- Verificar se o usuário tem um papel na empresa (user_companies)
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = services.company_id
      AND uc.user_id = auth.uid()
  )
  -- OU se o usuário é colaborador da empresa
  OR EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.company_id = services.company_id
      AND c.user_id = auth.uid()
      AND c.is_active = true
  )
)
WITH CHECK (
  -- Verificar se o usuário tem um papel na empresa (user_companies)
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = services.company_id
      AND uc.user_id = auth.uid()
  )
  -- OU se o usuário é colaborador da empresa
  OR EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.company_id = services.company_id
      AND c.user_id = auth.uid()
      AND c.is_active = true
  )
);

-- Política para DELETE: Usuários podem deletar serviços de empresas onde têm um papel
-- (user_companies) OU são colaboradores (collaborators)
CREATE POLICY "authenticated_users_can_delete_services" 
ON public.services
FOR DELETE
TO authenticated
USING (
  -- Verificar se o usuário tem um papel na empresa (user_companies)
  EXISTS (
    SELECT 1 
    FROM public.user_companies uc
    WHERE uc.company_id = services.company_id
      AND uc.user_id = auth.uid()
  )
  -- OU se o usuário é colaborador da empresa
  OR EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.company_id = services.company_id
      AND c.user_id = auth.uid()
      AND c.is_active = true
  )
);

-- =====================================================
-- FIM DA CORREÇÃO RLS para `services`
-- =====================================================

