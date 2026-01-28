-- =====================================================
-- DIAGNÓSTICO COMPLETO - Por que não há logs?
-- =====================================================

-- 1. Verificar se há empresas habilitadas
SELECT 
    'Empresas com WhatsApp habilitado' as verificação,
    COUNT(*) as total
FROM companies
WHERE whatsapp_messaging_enabled = true;

-- 2. Verificar se há provedor configurado
SELECT 
    'Provedores ativos' as verificação,
    id,
    name,
    is_active
FROM messaging_providers
WHERE channel = 'WHATSAPP' AND is_active = true;

-- 3. Verificar se há regras de envio configuradas
SELECT 
    'Regras de envio ativas' as verificação,
    cms.id,
    cms.company_id,
    cms.offset_value,
    cms.offset_unit,
    c.name as empresa
FROM company_message_schedules cms
JOIN companies c ON c.id = cms.company_id
WHERE cms.channel = 'WHATSAPP' 
  AND cms.is_active = true
  AND c.whatsapp_messaging_enabled = true;

-- 4. Verificar se há templates configurados
SELECT 
    'Templates ativos' as verificação,
    cmt.id,
    cmt.company_id,
    cmt.name,
    c.name as empresa
FROM company_message_templates cmt
JOIN companies c ON c.id = cmt.company_id
WHERE cmt.channel = 'WHATSAPP' 
  AND cmt.is_active = true
  AND c.whatsapp_messaging_enabled = true;

-- 5. Verificar se há agendamentos futuros
SELECT 
    'Agendamentos futuros' as verificação,
    COUNT(*) as total,
    MIN(appointment_date) as primeira_data,
    MAX(appointment_date) as ultima_data
FROM appointments a
JOIN companies c ON c.id = a.company_id
WHERE c.whatsapp_messaging_enabled = true
  AND a.status != 'cancelado'
  AND (a.appointment_date > CURRENT_DATE 
       OR (a.appointment_date = CURRENT_DATE 
           AND a.appointment_time > CURRENT_TIME));

-- 6. Verificar se os clientes têm telefone
SELECT 
    'Clientes com telefone' as verificação,
    COUNT(DISTINCT a.client_id) as clientes_com_telefone,
    COUNT(DISTINCT a.id) as total_agendamentos
FROM appointments a
JOIN companies c ON c.id = a.company_id
JOIN clients cl ON cl.id = a.client_id
WHERE c.whatsapp_messaging_enabled = true
  AND a.status != 'cancelado'
  AND cl.phone IS NOT NULL
  AND cl.phone != '';

-- 7. Verificar logs existentes
SELECT 
    'Logs existentes' as verificação,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sent,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
FROM message_send_log;

