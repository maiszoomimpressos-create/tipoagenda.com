-- Script para corrigir o LABEL do menu "planos"
-- O problema: o label está como "por" em vez de "Planos"

-- 1. Verificar o label atual do menu "planos"
SELECT 
  id,
  menu_key,
  label,
  icon,
  path,
  display_order,
  is_active,
  description
FROM menus
WHERE menu_key = 'planos';

-- 2. Atualizar o LABEL do menu "planos" para "Planos"
UPDATE menus
SET label = 'Planos'
WHERE menu_key = 'planos'
  AND is_active = true;

-- 3. Verificar se a atualização foi aplicada
SELECT 
  id,
  menu_key,
  label,
  icon,
  path,
  display_order,
  is_active,
  description
FROM menus
WHERE menu_key = 'planos';

-- 4. Verificar se há outros menus com labels incorretos ou incompletos
SELECT 
  menu_key,
  label,
  CASE 
    WHEN LENGTH(label) < 3 THEN 'Label muito curto'
    WHEN label LIKE '%?%' THEN 'Contém interrogação'
    WHEN label LIKE 'por%' THEN 'Parece incompleto'
    ELSE 'OK'
  END as status
FROM menus
WHERE is_active = true
ORDER BY display_order;

-- 5. Se necessário, também corrigir a descrição do menu "planos"
UPDATE menus
SET description = 'Gerencie sua assinatura, visualize planos disponíveis e altere seu plano atual.'
WHERE menu_key = 'planos'
  AND is_active = true
  AND (description IS NULL OR description = '' OR description LIKE '%por?%' OR description = 'por?');

