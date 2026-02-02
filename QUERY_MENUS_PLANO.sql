-- =====================================================
-- QUERY SIMPLIFICADA: Menus do Plano do Usuário
-- =====================================================
-- Esta query mostra todos os menus disponíveis no plano
-- da empresa do usuário thomaspedro2025@outlook.com
-- =====================================================

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
  SELECT plan_id 
  FROM company_subscriptions 
  WHERE company_id = (
    SELECT company_id 
    FROM collaborators 
    WHERE user_id = (
      SELECT id 
      FROM auth.users 
      WHERE email = 'thomaspedro2025@outlook.com' 
      LIMIT 1
    )
    LIMIT 1
  )
  AND status = 'active'
  ORDER BY start_date DESC
  LIMIT 1
)
AND m.is_active = true
ORDER BY m.display_order;

-- =====================================================
-- QUERY ALTERNATIVA: Se a query acima não funcionar
-- =====================================================
-- Execute primeiro esta para encontrar o plan_id manualmente:

-- PASSO 1: Encontrar company_id e plan_id
SELECT 
  c.company_id,
  cs.plan_id,
  sp.name as plan_name
FROM collaborators c
JOIN company_subscriptions cs ON cs.company_id = c.company_id
JOIN subscription_plans sp ON cs.plan_id = sp.id
WHERE c.user_id = (
  SELECT id FROM auth.users WHERE email = 'thomaspedro2025@outlook.com' LIMIT 1
)
AND cs.status = 'active'
ORDER BY cs.start_date DESC
LIMIT 1;

-- PASSO 2: Use o plan_id encontrado acima e substitua 'SEU_PLAN_ID_AQUI'
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
WHERE mp.plan_id = 'SEU_PLAN_ID_AQUI'  -- SUBSTITUA AQUI
AND m.is_active = true
ORDER BY m.display_order;

