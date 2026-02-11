-- =====================================================
-- VERIFICAR CONFIGURAÇÃO COMPLETA PARA TESTE
-- =====================================================

-- 1. Verificar empresas habilitadas
SELECT 
    id,
    name,
    whatsapp_messaging_enabled
FROM companies
WHERE whatsapp_messaging_enabled = true;

-- 2. Verificar provedor configurado
SELECT 
    id,
    name,
    base_url,
    http_method,
    LEFT(auth_token, 30) || '...' as auth_token_preview,
    user_id,
    queue_id,
    is_active
FROM messaging_providers
WHERE channel = 'WHATSAPP' 
  AND is_active = true;

-- 3. Verificar schedules (regras de envio)
SELECT 
    cms.id,
    c.name as empresa,
    mk.code as tipo_mensagem,
    cms.offset_value,
    cms.offset_unit,
    cms.reference,
    cms.is_active
FROM company_message_schedules cms
JOIN companies c ON c.id = cms.company_id
JOIN message_kinds mk ON mk.id = cms.message_kind_id
WHERE cms.channel = 'WHATSAPP'
  AND cms.is_active = true
  AND c.whatsapp_messaging_enabled = true;

-- 4. Verificar templates
SELECT 
    cmt.id,
    c.name as empresa,
    mk.code as tipo_mensagem,
    LEFT(cmt.body_template, 50) || '...' as template_preview,
    cmt.is_active
FROM company_message_templates cmt
JOIN companies c ON c.id = cmt.company_id
JOIN message_kinds mk ON mk.id = cmt.message_kind_id
WHERE cmt.channel = 'WHATSAPP'
  AND cmt.is_active = true
  AND c.whatsapp_messaging_enabled = true;

-- 5. Verificar agendamentos recentes com clientes que têm telefone
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    c.name as cliente,
    c.phone as telefone_cliente
FROM appointments a
LEFT JOIN clients c ON c.id = a.client_id
WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '7 days'
  AND a.appointment_date <= CURRENT_DATE + INTERVAL '7 days'
  AND a.status != 'cancelado'
  AND c.phone IS NOT NULL
ORDER BY a.appointment_date DESC, a.appointment_time DESC
LIMIT 10;

-- =====================================================
-- RESUMO: Para funcionar, você precisa ter:
-- ✅ Pelo menos 1 empresa com whatsapp_messaging_enabled = true
-- ✅ 1 provedor WHATSAPP ativo com URL, token, user_id e queue_id corretos
-- ✅ Pelo menos 1 schedule (regra de envio) ativo
-- ✅ Pelo menos 1 template ativo para o tipo de mensagem do schedule
-- ✅ Agendamentos com clientes que têm telefone cadastrado
-- =====================================================

