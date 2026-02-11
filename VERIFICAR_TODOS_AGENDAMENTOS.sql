-- =====================================================
-- VERIFICAR TODOS OS AGENDAMENTOS (SEM FILTROS)
-- =====================================================

-- Agendamentos de hoje (sem filtro de telefone)
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.company_id,
    a.client_id,
    c.name as cliente,
    c.phone as telefone_cliente,
    a.created_at
FROM appointments a
LEFT JOIN clients c ON c.id = a.client_id
WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY a.created_at DESC
LIMIT 50;

-- Agendamentos sem cliente vinculado
SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.client_id,
    a.created_at
FROM appointments a
WHERE a.client_id IS NULL
  AND a.appointment_date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY a.created_at DESC;

