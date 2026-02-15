-- Script para verificar e diagnosticar problemas na vinculação de planos aos menus

-- 1. Verificar se a tabela menu_plans existe e tem dados
SELECT 
  'Total de vinculações' as descricao,
  COUNT(*) as quantidade
FROM menu_plans;

-- 2. Verificar vinculações existentes com detalhes
SELECT 
  mp.id as vinculacao_id,
  mp.menu_id,
  m.menu_key,
  m.label as menu_nome,
  mp.plan_id,
  sp.name as plano_nome,
  sp.status as plano_status,
  mp.created_at
FROM menu_plans mp
LEFT JOIN menus m ON m.id = mp.menu_id
LEFT JOIN subscription_plans sp ON sp.id = mp.plan_id
ORDER BY m.label, sp.name;

-- 3. Verificar menus que NÃO têm planos vinculados
SELECT 
  m.id,
  m.menu_key,
  m.label,
  m.is_active,
  COUNT(mp.id) as total_vinculacoes
FROM menus m
LEFT JOIN menu_plans mp ON mp.menu_id = m.id
WHERE m.is_active = true
GROUP BY m.id, m.menu_key, m.label, m.is_active
HAVING COUNT(mp.id) = 0
ORDER BY m.display_order;

-- 4. Verificar se há planos ativos disponíveis
SELECT 
  id,
  name,
  status,
  price
FROM subscription_plans
WHERE status = 'active'
ORDER BY name;

-- 5. Verificar RLS policies na tabela menu_plans
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'menu_plans';

-- 6. Teste: Tentar inserir uma vinculação de teste (comentar depois)
-- IMPORTANTE: Substituir os UUIDs pelos IDs reais do seu banco
/*
INSERT INTO menu_plans (menu_id, plan_id)
SELECT 
  (SELECT id FROM menus WHERE menu_key = 'dashboard' LIMIT 1),
  (SELECT id FROM subscription_plans WHERE name LIKE '%Platinum%' AND status = 'active' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM menu_plans 
  WHERE menu_id = (SELECT id FROM menus WHERE menu_key = 'dashboard' LIMIT 1)
    AND plan_id = (SELECT id FROM subscription_plans WHERE name LIKE '%Platinum%' AND status = 'active' LIMIT 1)
);
*/

-- 7. Verificar se há problemas de foreign key
SELECT 
  'Menus órfãos (sem referência válida)' as tipo,
  COUNT(*) as quantidade
FROM menu_plans mp
LEFT JOIN menus m ON m.id = mp.menu_id
WHERE m.id IS NULL

UNION ALL

SELECT 
  'Planos órfãos (sem referência válida)' as tipo,
  COUNT(*) as quantidade
FROM menu_plans mp
LEFT JOIN subscription_plans sp ON sp.id = mp.plan_id
WHERE sp.id IS NULL;

