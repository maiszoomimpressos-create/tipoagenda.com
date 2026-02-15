-- Script para verificar e corrigir o LABEL e a descrição do menu "planos"
-- O problema relatado: label aparece como "por" em vez de "Planos"

-- 1. Verificar o label e descrição atual do menu "planos"
SELECT 
  id,
  menu_key,
  label,
  description,
  icon,
  path,
  display_order,
  is_active
FROM menus
WHERE menu_key = 'planos'
  AND is_active = true;

-- 2. CORRIGIR O LABEL do menu "planos" para "Planos" (PRINCIPAL)
UPDATE menus
SET label = 'Planos'
WHERE menu_key = 'planos'
  AND is_active = true;

-- 3. Atualizar a descrição do menu "planos" com uma descrição adequada
-- Se a descrição estiver como "por?" ou incompleta, será corrigida
UPDATE menus
SET description = 'Gerencie sua assinatura, visualize planos disponíveis e altere seu plano atual.'
WHERE menu_key = 'planos'
  AND is_active = true
  AND (description IS NULL OR description = '' OR description LIKE '%por?%' OR description = 'por?');

-- 4. Verificar se a atualização foi aplicada
SELECT 
  id,
  menu_key,
  label,
  description,
  icon,
  path,
  display_order,
  is_active
FROM menus
WHERE menu_key = 'planos'
  AND is_active = true;

-- 5. Verificar se há outros menus com labels ou descrições problemáticas
SELECT 
  menu_key,
  label,
  description,
  CASE 
    WHEN label LIKE 'por%' OR label = 'por' THEN '⚠️ Label parece incompleto'
    WHEN LENGTH(label) < 3 THEN '⚠️ Label muito curto'
    WHEN description LIKE '%?%' OR description = 'por?' THEN '⚠️ Descrição problemática'
    ELSE '✅ OK'
  END as status
FROM menus
WHERE is_active = true
ORDER BY display_order;

