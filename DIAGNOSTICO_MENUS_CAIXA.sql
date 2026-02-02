-- =====================================================
-- DIAGNÓSTICO: Menus para função "Caixa"
-- =====================================================
-- Execute estas queries na ordem para diagnosticar o problema
-- =====================================================

-- 1. ENCONTRAR O ID DA EMPRESA DO USUÁRIO
-- Substitua 'thomaspedro2025@outlook.com' pelo email do usuário
SELECT 
  u.id as user_id,
  u.email,
  c.company_id,
  comp.name as company_name
FROM auth.users u
LEFT JOIN collaborators c ON c.user_id = u.id
LEFT JOIN companies comp ON comp.id = c.company_id
WHERE u.email = 'thomaspedro2025@outlook.com';

-- 2. VERIFICAR O ROLE_TYPE_ID DO COLABORADOR
-- Use o user_id encontrado na query anterior
SELECT 
  c.user_id,
  c.company_id,
  c.role_type_id,
  rt.description as role_name,
  rt.id as role_type_id_from_table
FROM collaborators c
JOIN role_types rt ON c.role_type_id = rt.id
WHERE c.user_id = (SELECT id FROM auth.users WHERE email = 'thomaspedro2025@outlook.com' LIMIT 1);

-- 3. VERIFICAR O PLANO ATIVO DA EMPRESA
-- Use o company_id encontrado na query 1
SELECT 
  cs.id,
  cs.company_id,
  cs.plan_id,
  sp.name as plan_name,
  cs.status,
  cs.start_date
FROM company_subscriptions cs
JOIN subscription_plans sp ON cs.plan_id = sp.id
WHERE cs.company_id = (
  SELECT company_id FROM collaborators 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomaspedro2025@outlook.com' LIMIT 1)
  LIMIT 1
)
AND cs.status = 'active'
ORDER BY cs.start_date DESC
LIMIT 1;

-- 4. VERIFICAR QUAIS MENUS ESTÃO VINCULADOS AO PLANO
-- Use o plan_id encontrado na query 3
SELECT 
  mp.plan_id,
  sp.name as plan_name,
  m.id as menu_id,
  m.menu_key,
  m.label,
  m.is_active,
  m.display_order
FROM menu_plans mp
JOIN menus m ON mp.menu_id = m.id
JOIN subscription_plans sp ON mp.plan_id = sp.id
WHERE mp.plan_id = (
  SELECT plan_id FROM company_subscriptions 
  WHERE company_id = (
    SELECT company_id FROM collaborators 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomaspedro2025@outlook.com' LIMIT 1)
    LIMIT 1
  )
  AND status = 'active'
  ORDER BY start_date DESC
  LIMIT 1
)
AND m.is_active = true
ORDER BY m.display_order;

-- 5. VERIFICAR PERMISSÕES CONFIGURADAS PARA A FUNÇÃO "CAIXA"
-- Use o company_id e role_type_id encontrados nas queries anteriores
SELECT 
  mrp.id,
  mrp.company_id,
  mrp.menu_id,
  mrp.role_type_id,
  m.menu_key,
  m.label as menu_label,
  rt.description as role_name,
  mrp.has_access
FROM menu_role_permissions mrp
JOIN menus m ON mrp.menu_id = m.id
JOIN role_types rt ON mrp.role_type_id = rt.id
WHERE mrp.company_id = (
  SELECT company_id FROM collaborators 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomaspedro2025@outlook.com' LIMIT 1)
  LIMIT 1
)
AND mrp.role_type_id = (
  SELECT role_type_id FROM collaborators 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'thomaspedro2025@outlook.com' LIMIT 1)
  LIMIT 1
)
ORDER BY m.display_order;

-- 6. VERIFICAR TODOS OS ROLE_TYPES DISPONÍVEIS (para referência)
SELECT id, description, apresentar
FROM role_types
ORDER BY description;

-- =====================================================
-- QUERY COMPLETA: Tudo de uma vez
-- =====================================================
-- Esta query mostra tudo que o sistema deveria encontrar
SELECT 
  -- Dados do usuário
  u.email,
  -- Dados do colaborador
  c.company_id,
  c.role_type_id as collaborator_role_type_id,
  rt.description as role_name,
  -- Dados do plano
  cs.plan_id,
  sp.name as plan_name,
  cs.status as subscription_status,
  -- Dados dos menus do plano
  m.id as menu_id,
  m.menu_key,
  m.label as menu_label,
  m.is_active as menu_is_active,
  -- Permissões
  mrp.has_access,
  CASE 
    WHEN mrp.has_access IS NULL THEN 'Permitido (default)'
    WHEN mrp.has_access = true THEN 'Permitido'
    ELSE 'Bloqueado'
  END as access_status
FROM auth.users u
JOIN collaborators c ON c.user_id = u.id
JOIN role_types rt ON c.role_type_id = rt.id
LEFT JOIN company_subscriptions cs ON cs.company_id = c.company_id AND cs.status = 'active'
LEFT JOIN subscription_plans sp ON cs.plan_id = sp.id
LEFT JOIN menu_plans mp ON mp.plan_id = cs.plan_id
LEFT JOIN menus m ON mp.menu_id = m.id AND m.is_active = true
LEFT JOIN menu_role_permissions mrp ON mrp.company_id = c.company_id 
  AND mrp.role_type_id = c.role_type_id 
  AND mrp.menu_id = m.id
WHERE u.email = 'thomaspedro2025@outlook.com'
ORDER BY m.display_order;

