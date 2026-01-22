-- Script para verificar e corrigir role de Proprietário na tabela user_companies
-- Execute este script no Supabase SQL Editor para verificar/corrigir o role do usuário

-- 1. Verificar qual é o ID do role "Proprietário" na tabela role_types
SELECT id, description 
FROM public.role_types 
WHERE description = 'Proprietário';

-- 2. Verificar qual role o usuário tem atualmente na tabela user_companies
-- Substitua 'USER_ID_AQUI' pelo ID do usuário que está com problema
-- Exemplo: '6a2148e0-280e-459e-a953-1140e581e893'
SELECT 
    uc.user_id,
    uc.company_id,
    uc.role_type,
    rt.description as role_description,
    uc.is_primary
FROM public.user_companies uc
LEFT JOIN public.role_types rt ON uc.role_type = rt.id
WHERE uc.user_id = '6a2148e0-280e-459e-a953-1140e581e893'; -- SUBSTITUA PELO USER_ID CORRETO

-- 3. Corrigir o role para "Proprietário" se estiver errado
-- IMPORTANTE: Substitua 'USER_ID_AQUI' e 'COMPANY_ID_AQUI' pelos valores corretos
-- E substitua 'PROPRIETARIO_ROLE_ID' pelo ID retornado na query 1 acima
/*
UPDATE public.user_companies
SET role_type = (SELECT id FROM public.role_types WHERE description = 'Proprietário' LIMIT 1)
WHERE user_id = 'USER_ID_AQUI'
  AND company_id = 'COMPANY_ID_AQUI';
*/

-- 4. Verificar se type_user está correto
SELECT user_id, cod, descr
FROM public.type_user
WHERE user_id = '6a2148e0-280e-459e-a953-1140e581e893'; -- SUBSTITUA PELO USER_ID CORRETO

-- 5. Corrigir type_user se estiver errado ou não existir
-- IMPORTANTE: Substitua 'USER_ID_AQUI' pelo ID do usuário correto
/*
INSERT INTO public.type_user (user_id, cod, descr)
VALUES ('USER_ID_AQUI', 'PROPRIETARIO', 'Proprietário')
ON CONFLICT (user_id) 
DO UPDATE SET cod = 'PROPRIETARIO', descr = 'Proprietário';
*/

