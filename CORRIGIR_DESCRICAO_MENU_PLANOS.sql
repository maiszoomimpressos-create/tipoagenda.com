-- Script para verificar e corrigir a descrição do menu "planos"
-- O problema relatado: descrição aparece como "por?" no sistema

-- 1. Verificar a descrição atual do menu "planos"
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

-- 2. Atualizar a descrição do menu "planos" com uma descrição adequada
-- Se a descrição estiver como "por?" ou incompleta, será corrigida
UPDATE menus
SET description = 'Gerencie sua assinatura, visualize planos disponíveis e altere seu plano atual.'
WHERE menu_key = 'planos'
  AND is_active = true
  AND (description IS NULL OR description = '' OR description LIKE '%por?%' OR description = 'por?');

-- 3. Verificar se a atualização foi aplicada
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

-- 4. Se necessário, também verificar se há outros menus com descrições problemáticas
SELECT 
  menu_key,
  label,
  description
FROM menus
WHERE is_active = true
  AND (description IS NULL OR description = '' OR description LIKE '%?%')
ORDER BY display_order;

