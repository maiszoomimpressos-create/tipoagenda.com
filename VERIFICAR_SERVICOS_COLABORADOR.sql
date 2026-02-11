-- =====================================================
-- VERIFICAR SERVIÇOS DO COLABORADOR
-- =====================================================
-- Execute este SQL para verificar se há serviços cadastrados
-- para o colaborador na tabela collaborator_services
-- =====================================================

-- Substitua os IDs abaixo pelos valores corretos
-- companyId: pegue da URL
-- collaboratorId: ID do colaborador selecionado

-- 1. Verificar todos os colaboradores da empresa
SELECT 
    c.id as collaborator_id,
    c.first_name || ' ' || c.last_name as colaborador,
    c.company_id
FROM collaborators c
WHERE c.company_id = 'SUBSTITUA_PELO_COMPANY_ID_DA_URL'
  AND c.is_active = true
ORDER BY c.first_name;

-- 2. Verificar serviços cadastrados para um colaborador específico
SELECT 
    cs.id,
    cs.company_id,
    cs.collaborator_id,
    c.first_name || ' ' || c.last_name as colaborador,
    cs.service_id,
    s.name as servico,
    cs.active,
    cs.commission_type,
    cs.commission_value
FROM collaborator_services cs
JOIN collaborators c ON c.id = cs.collaborator_id
JOIN services s ON s.id = cs.service_id
WHERE cs.company_id = 'SUBSTITUA_PELO_COMPANY_ID_DA_URL'
  AND cs.collaborator_id = 'SUBSTITUA_PELO_COLABORADOR_ID'
  AND cs.active = true
ORDER BY s.name;

-- 3. Verificar todos os serviços da empresa
SELECT 
    s.id,
    s.name,
    s.price,
    s.duration_minutes,
    s.is_active,
    s.company_id
FROM services s
WHERE s.company_id = 'SUBSTITUA_PELO_COMPANY_ID_DA_URL'
  AND s.is_active = true
ORDER BY s.name;

-- 4. Contar quantos serviços cada colaborador tem cadastrado
SELECT 
    c.id as collaborator_id,
    c.first_name || ' ' || c.last_name as colaborador,
    COUNT(cs.id) as total_servicos_cadastrados
FROM collaborators c
LEFT JOIN collaborator_services cs ON cs.collaborator_id = c.id 
    AND cs.company_id = c.company_id 
    AND cs.active = true
WHERE c.company_id = 'SUBSTITUA_PELO_COMPANY_ID_DA_URL'
  AND c.is_active = true
GROUP BY c.id, c.first_name, c.last_name
ORDER BY c.first_name;

