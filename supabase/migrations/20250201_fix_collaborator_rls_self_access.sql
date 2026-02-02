-- =====================================================
-- CORREÇÃO: Permitir que colaboradores vejam seu próprio registro
-- =====================================================
-- Problema: A política RLS atual só permite ver colaboradores se o usuário
-- estiver em user_companies. Mas colaboradores podem não estar em user_companies,
-- então não conseguem ver seu próprio registro para validar o vínculo.
-- 
-- Solução: Adicionar política que permite que um usuário veja seu próprio
-- registro em collaborators, independentemente de estar em user_companies.
-- =====================================================

-- Remover política antiga se existir (para garantir que será recriada corretamente)
DROP POLICY IF EXISTS "users_can_view_own_collaborator_record" ON public.collaborators;

-- Adicionar política para permitir que usuários vejam seu próprio registro
CREATE POLICY "users_can_view_own_collaborator_record"
ON public.collaborators
FOR SELECT
TO authenticated
USING (
  -- Permite que o usuário veja seu próprio registro em collaborators
  user_id = auth.uid()
);

COMMENT ON POLICY "users_can_view_own_collaborator_record" ON public.collaborators IS 
'Permite que um usuário veja seu próprio registro em collaborators, necessário para validação de vínculo durante login';

-- =====================================================
-- FIM DA CORREÇÃO
-- =====================================================

