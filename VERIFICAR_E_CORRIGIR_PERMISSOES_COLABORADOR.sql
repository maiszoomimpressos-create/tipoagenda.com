-- =====================================================
-- SCRIPT PARA VERIFICAR E CORRIGIR PERMISSÕES DE COLABORADOR
-- =====================================================
-- Execute este script no SQL Editor do Supabase para diagnosticar e corrigir problemas de permissão

-- 1. VERIFICAR SE O USUÁRIO ESTÁ EM user_companies
-- Substitua 'SEU_USER_ID_AQUI' pelo ID do usuário que está tentando criar colaboradores
-- Você pode encontrar o user_id no console do navegador (session.user.id)

SELECT 
  uc.user_id,
  uc.company_id,
  c.name as company_name,
  rt.description as role_description,
  uc.role_type
FROM user_companies uc
JOIN companies c ON c.id = uc.company_id
LEFT JOIN role_types rt ON rt.id = uc.role_type
WHERE uc.user_id = 'SEU_USER_ID_AQUI'  -- SUBSTITUA AQUI
ORDER BY uc.company_id;

-- 2. VERIFICAR SE O USUÁRIO TEM ROLE 'Proprietário' OU 'Admin'
-- Se não aparecer nenhum resultado acima, o usuário não está associado a nenhuma empresa
-- Se aparecer mas o role_description não for 'Proprietário' ou 'Admin', você precisa atualizar

SELECT 
  uc.user_id,
  uc.company_id,
  c.name as company_name,
  rt.description as role_description
FROM user_companies uc
JOIN companies c ON c.id = uc.company_id
JOIN role_types rt ON rt.id = uc.role_type
WHERE uc.user_id = 'SEU_USER_ID_AQUI'  -- SUBSTITUA AQUI
  AND LOWER(TRIM(rt.description)) IN ('proprietário', 'admin')
ORDER BY uc.company_id;

-- 3. CORRIGIR: Adicionar usuário a user_companies com role 'Proprietário' (se necessário)
-- ATENÇÃO: Execute apenas se o usuário realmente deve ser proprietário/admin da empresa
-- Substitua os valores abaixo:
--   - 'SEU_USER_ID_AQUI': ID do usuário
--   - 'COMPANY_ID_AQUI': ID da empresa primária do usuário

-- Primeiro, encontre o ID do role 'Proprietário'
SELECT id, description FROM role_types WHERE LOWER(TRIM(description)) = 'proprietário';

-- Depois, insira ou atualize o registro em user_companies
INSERT INTO user_companies (user_id, company_id, role_type, created_at, updated_at)
VALUES (
  'SEU_USER_ID_AQUI',  -- SUBSTITUA AQUI
  'COMPANY_ID_AQUI',   -- SUBSTITUA AQUI
  (SELECT id FROM role_types WHERE LOWER(TRIM(description)) = 'proprietário' LIMIT 1),
  NOW(),
  NOW()
)
ON CONFLICT (user_id, company_id) 
DO UPDATE SET 
  role_type = (SELECT id FROM role_types WHERE LOWER(TRIM(description)) = 'proprietário' LIMIT 1),
  updated_at = NOW();

-- 4. VERIFICAR TODOS OS ROLE_TYPES DISPONÍVEIS (para referência)
SELECT id, description FROM role_types ORDER BY description;

-- 5. VERIFICAR SE A EMPRESA PRIMÁRIA ESTÁ CORRETA
-- Execute a função RPC get_user_context para ver o contexto do usuário
-- Substitua 'SEU_USER_ID_AQUI' pelo ID do usuário (use aspas simples)
-- EXEMPLO: SELECT * FROM get_user_context('42cc3c59-d436-4bf1-b90a-8be4cf23098f');

SELECT * FROM get_user_context('42cc3c59-d436-4bf1-b90a-8be4cf23098f');

