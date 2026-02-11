-- =====================================================
-- CORRIGIR TODAS AS RLS PARA PÁGINA DE CONVIDADO
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- Para permitir que a página de convidado (sem autenticação)
-- possa funcionar completamente
-- =====================================================

-- =====================================================
-- 1. TABELA: collaborator_services (LER serviços do colaborador)
-- =====================================================

DROP POLICY IF EXISTS "anon_can_view_collaborator_services" ON public.collaborator_services;

CREATE POLICY "anon_can_view_collaborator_services" 
ON public.collaborator_services
FOR SELECT
TO anon
USING (
  active = true
  AND EXISTS (
    SELECT 1 
    FROM public.collaborators c
    WHERE c.id = collaborator_services.collaborator_id
      AND c.company_id = collaborator_services.company_id
      AND c.is_active = true
  )
  AND EXISTS (
    SELECT 1 
    FROM public.services s
    WHERE s.id = collaborator_services.service_id
      AND s.company_id = collaborator_services.company_id
      AND s.is_active = true
  )
);

-- =====================================================
-- 2. TABELA: clients (CRIAR e LER clientes)
-- =====================================================

DROP POLICY IF EXISTS "anon_can_insert_clients" ON public.clients;
DROP POLICY IF EXISTS "anon_can_view_clients" ON public.clients;

-- INSERT: Permitir criação pública de clientes
CREATE POLICY "anon_can_insert_clients" 
ON public.clients
FOR INSERT
TO anon
WITH CHECK (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.companies c
    WHERE c.id = clients.company_id
  )
);

-- SELECT: Permitir leitura pública de clientes
CREATE POLICY "anon_can_view_clients" 
ON public.clients
FOR SELECT
TO anon
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.companies c
    WHERE c.id = clients.company_id
  )
);

-- =====================================================
-- 3. TABELA: appointments (CRIAR agendamentos)
-- =====================================================

DROP POLICY IF EXISTS "anon_can_insert_appointments" ON public.appointments;

CREATE POLICY "anon_can_insert_appointments" 
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.companies c
    WHERE c.id = appointments.company_id
  )
  AND EXISTS (
    SELECT 1 
    FROM public.clients cl
    WHERE cl.id = appointments.client_id
      AND cl.company_id = appointments.company_id
  )
);

-- =====================================================
-- 4. TABELA: appointment_services (VINCULAR serviços)
-- =====================================================

DROP POLICY IF EXISTS "anon_can_insert_appointment_services" ON public.appointment_services;

CREATE POLICY "anon_can_insert_appointment_services" 
ON public.appointment_services
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.appointments a
    JOIN public.companies c ON c.id = a.company_id
    WHERE a.id = appointment_services.appointment_id
  )
  AND EXISTS (
    SELECT 1 
    FROM public.appointments a
    JOIN public.services s ON s.company_id = a.company_id
    WHERE a.id = appointment_services.appointment_id
      AND s.id = appointment_services.service_id
      AND s.is_active = true
  )
);

-- =====================================================
-- VERIFICAR POLÍTICAS CRIADAS
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('collaborator_services', 'clients', 'appointments', 'appointment_services')
  AND policyname LIKE 'anon_can_%'
ORDER BY tablename, policyname;

-- =====================================================
-- FIM
-- =====================================================

