-- =====================================================
-- CORRIGIR SISTEMA DE TIPOS DE MENSAGEM
-- =====================================================
-- Problema: Está criando duas mensagens para cada agendamento
-- Solução: Filtrar por tipo de mensagem nos triggers
-- =====================================================

-- 1. Criar tipo POST_SERVICE_THANKS se não existir
INSERT INTO message_kinds (code, default_name, description)
VALUES
  ('POST_SERVICE_THANKS', 'Agradecimento Pós-Atendimento', 'Mensagem de agradecimento enviada após finalizar o atendimento')
ON CONFLICT (code) DO NOTHING;

-- 2. Verificar tipos existentes
SELECT 
    id,
    code,
    default_name,
    description,
    CASE 
        WHEN code = 'APPOINTMENT_REMINDER' THEN '✅ LEMBRETE (antes do agendamento)'
        WHEN code = 'POST_SERVICE_THANKS' THEN '✅ AGRADECIMENTO (após finalizar)'
        ELSE '⚠️ OUTRO TIPO'
    END as quando_enviar
FROM message_kinds
ORDER BY code;

-- 3. Modificar função para aceitar filtro por tipo de mensagem
CREATE OR REPLACE FUNCTION public.schedule_whatsapp_messages_for_appointment(
    p_appointment_id UUID,
    p_message_kind_code TEXT DEFAULT NULL  -- NULL = processar todos, 'APPOINTMENT_REMINDER' = apenas lembretes, 'POST_SERVICE_THANKS' = apenas agradecimentos
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_appointment RECORD;
    v_company RECORD;
    v_client RECORD;
    v_provider RECORD;
    v_template RECORD;
    v_schedules RECORD;
    v_reference_date TIMESTAMPTZ;
    v_scheduled_for TIMESTAMPTZ;
    v_offset_value INTEGER;
    v_offset_unit TEXT;
    v_logs_created INTEGER := 0;
    v_logs_skipped INTEGER := 0;
    v_errors TEXT[] := ARRAY[]::TEXT[];
    v_time_str TEXT;
    v_year INTEGER;
    v_month INTEGER;
    v_day INTEGER;
    v_hour INTEGER;
    v_minute INTEGER;
    v_phone_digits TEXT;
    v_phone_valid BOOLEAN := FALSE;
    v_total_schedules INTEGER;
    v_message_kind_filter TEXT;
BEGIN
    -- 1. Buscar dados do agendamento (SEM updated_at)
    SELECT 
        a.id,
        a.company_id,
        a.client_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.created_at
    INTO v_appointment
    FROM appointments a
    WHERE a.id = p_appointment_id;

    IF v_appointment.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Agendamento não encontrado.'
        );
    END IF;

    -- 2. Verificar se o agendamento não está cancelado
    IF v_appointment.status = 'cancelado' THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'Agendamento cancelado, nenhuma mensagem será agendada.',
            'logs_created', 0
        );
    END IF;

    -- 3. Buscar dados da empresa e verificar se WhatsApp está habilitado
    SELECT 
        c.id,
        c.whatsapp_messaging_enabled
    INTO v_company
    FROM companies c
    WHERE c.id = v_appointment.company_id;

    IF v_company.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Empresa não encontrada.'
        );
    END IF;

    IF NOT v_company.whatsapp_messaging_enabled THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'Mensagens WhatsApp desabilitadas para esta empresa.',
            'logs_created', 0
        );
    END IF;

    -- 4. Buscar dados do cliente e verificar telefone
    SELECT 
        c.id,
        c.phone
    INTO v_client
    FROM clients c
    WHERE c.id = v_appointment.client_id;

    IF v_client.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Cliente não encontrado.'
        );
    END IF;

    -- Validar telefone do cliente
    IF v_client.phone IS NULL OR TRIM(v_client.phone) = '' THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'Cliente não possui telefone cadastrado.',
            'logs_created', 0,
            'logs_skipped', 0,
            'errors', ARRAY['Telefone do cliente é NULL ou vazio']
        );
    END IF;

    -- Validar se o telefone não é um placeholder inválido
    v_phone_digits := REGEXP_REPLACE(v_client.phone, '[^0-9]', '', 'g');
    
    IF LENGTH(v_phone_digits) >= 10 THEN
        IF v_phone_digits != REPEAT('0', LENGTH(v_phone_digits)) THEN
            v_phone_valid := TRUE;
        END IF;
    END IF;
    
    IF NOT v_phone_valid THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'Telefone do cliente é inválido (placeholder ou formato incorreto).',
            'logs_created', 0,
            'logs_skipped', 0,
            'errors', ARRAY['Telefone inválido: ' || v_client.phone || ' (após limpeza: ' || COALESCE(v_phone_digits, 'NULL') || ')']
        );
    END IF;

    -- 5. Buscar provedor de WhatsApp ativo
    SELECT 
        mp.id,
        mp.name
    INTO v_provider
    FROM messaging_providers mp
    WHERE mp.channel = 'WHATSAPP'
      AND mp.is_active = TRUE
    LIMIT 1;

    IF v_provider.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Nenhum provedor de WhatsApp ativo encontrado.'
        );
    END IF;

    -- 6. Buscar regras de envio ativas para a empresa
    -- FILTRO: Se p_message_kind_code foi informado, filtrar apenas esse tipo
    v_message_kind_filter := p_message_kind_code;
    
    SELECT COUNT(*) INTO v_total_schedules
    FROM company_message_schedules cms
    JOIN message_kinds mk ON mk.id = cms.message_kind_id
    WHERE cms.company_id = v_appointment.company_id
      AND cms.channel = 'WHATSAPP'
      AND cms.is_active = TRUE
      AND (v_message_kind_filter IS NULL OR mk.code = v_message_kind_filter);
    
    IF v_total_schedules = 0 THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', CASE 
                WHEN v_message_kind_filter IS NULL THEN 'Nenhuma regra de envio ativa encontrada para esta empresa.'
                ELSE 'Nenhuma regra de envio ativa encontrada para o tipo: ' || v_message_kind_filter
            END,
            'logs_created', 0,
            'logs_skipped', 0,
            'errors', ARRAY['Nenhuma regra de envio ativa encontrada' || CASE WHEN v_message_kind_filter IS NOT NULL THEN ' para tipo: ' || v_message_kind_filter ELSE '' END]
        );
    END IF;

    -- 7. Processar cada regra de envio (FILTRADA POR TIPO)
    FOR v_schedules IN
        SELECT 
            cms.id,
            cms.message_kind_id,
            cms.offset_value,
            cms.offset_unit,
            cms.reference,
            mk.code as message_kind_code
        FROM company_message_schedules cms
        JOIN message_kinds mk ON mk.id = cms.message_kind_id
        WHERE cms.company_id = v_appointment.company_id
          AND cms.channel = 'WHATSAPP'
          AND cms.is_active = TRUE
          AND (v_message_kind_filter IS NULL OR mk.code = v_message_kind_filter)
    LOOP
        BEGIN
            -- 8. Calcular data/hora de referência baseado no tipo
            IF v_schedules.reference = 'APPOINTMENT_START' THEN
                -- Usar data/hora do agendamento
                v_time_str := SUBSTRING(v_appointment.appointment_time::TEXT FROM 1 FOR 5);
                v_year := EXTRACT(YEAR FROM v_appointment.appointment_date::DATE);
                v_month := EXTRACT(MONTH FROM v_appointment.appointment_date::DATE);
                v_day := EXTRACT(DAY FROM v_appointment.appointment_date::DATE);
                v_hour := CAST(SPLIT_PART(v_time_str, ':', 1) AS INTEGER);
                v_minute := CAST(SPLIT_PART(v_time_str, ':', 2) AS INTEGER);
                
                BEGIN
                    v_reference_date := (
                        v_year || '-' || 
                        LPAD(v_month::TEXT, 2, '0') || '-' || 
                        LPAD(v_day::TEXT, 2, '0') || 'T' || 
                        LPAD(v_hour::TEXT, 2, '0') || ':' || 
                        LPAD(v_minute::TEXT, 2, '0') || ':00-03:00'
                    )::TIMESTAMPTZ;
                EXCEPTION
                    WHEN OTHERS THEN
                        v_errors := array_append(v_errors, 'Erro ao calcular data de referência para APPOINTMENT_START: ' || SQLERRM);
                        v_logs_skipped := v_logs_skipped + 1;
                        CONTINUE;
                END;
                
            ELSIF v_schedules.reference = 'APPOINTMENT_CREATION' THEN
                -- Usar created_at (momento da criação do agendamento)
                v_reference_date := v_appointment.created_at;
                
            ELSIF v_schedules.reference = 'APPOINTMENT_COMPLETION' THEN
                -- Para finalização, usar NOW() quando o trigger for chamado após UPDATE
                v_reference_date := NOW();
                
            ELSE
                -- Tipo de referência não suportado
                v_errors := array_append(v_errors, 'Tipo de referência não tratado: ' || v_schedules.reference);
                v_logs_skipped := v_logs_skipped + 1;
                CONTINUE;
            END IF;

            -- 9. Calcular scheduled_for aplicando o offset
            v_offset_value := v_schedules.offset_value;
            v_offset_unit := v_schedules.offset_unit;
            
            CASE v_offset_unit
                WHEN 'MINUTES' THEN
                    v_scheduled_for := v_reference_date + (v_offset_value || ' minutes')::INTERVAL;
                WHEN 'HOURS' THEN
                    v_scheduled_for := v_reference_date + (v_offset_value || ' hours')::INTERVAL;
                WHEN 'DAYS' THEN
                    v_scheduled_for := v_reference_date + (v_offset_value || ' days')::INTERVAL;
                ELSE
                    v_errors := array_append(v_errors, 'Unidade de offset não suportada: ' || v_offset_unit);
                    v_logs_skipped := v_logs_skipped + 1;
                    CONTINUE;
            END CASE;

            -- 10. Buscar template (opcional - pode ser NULL)
            SELECT cmt.id
            INTO v_template
            FROM company_message_templates cmt
            WHERE cmt.company_id = v_appointment.company_id
              AND cmt.message_kind_id = v_schedules.message_kind_id
              AND cmt.channel = 'WHATSAPP'
              AND cmt.is_active = TRUE
            LIMIT 1;

            -- 11. Criar log de envio
            BEGIN
                INSERT INTO message_send_log (
                    company_id,
                    client_id,
                    appointment_id,
                    message_kind_id,
                    channel,
                    template_id,
                    provider_id,
                    scheduled_for,
                    sent_at,
                    status
                ) VALUES (
                    v_appointment.company_id,
                    v_appointment.client_id,
                    v_appointment.id,
                    v_schedules.message_kind_id,
                    'WHATSAPP',
                    v_template.id,  -- Pode ser NULL
                    v_provider.id,
                    v_scheduled_for,
                    NULL,
                    'PENDING'
                );
                
                v_logs_created := v_logs_created + 1;
            EXCEPTION
                WHEN OTHERS THEN
                    v_errors := array_append(v_errors, 'Erro ao criar log de envio para ' || v_schedules.message_kind_code || ': ' || SQLERRM);
                    v_logs_skipped := v_logs_skipped + 1;
            END;

        EXCEPTION
            WHEN OTHERS THEN
                v_errors := array_append(v_errors, 'Erro ao processar regra de envio ' || v_schedules.id::TEXT || ': ' || SQLERRM);
                v_logs_skipped := v_logs_skipped + 1;
        END;
    END LOOP;

    -- 12. Retornar resultado
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Processamento concluído.',
        'logs_created', v_logs_created,
        'logs_skipped', v_logs_skipped,
        'errors', v_errors,
        'filter_applied', COALESCE(p_message_kind_code, 'NENHUM (processou todos os tipos)')
    );
END;
$function$;

-- 4. Modificar trigger de CRIAÇÃO para processar apenas APPOINTMENT_REMINDER
CREATE OR REPLACE FUNCTION public.handle_appointment_creation_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    BEGIN
        -- Processar apenas mensagens do tipo APPOINTMENT_REMINDER (lembrete antes do agendamento)
        PERFORM public.schedule_whatsapp_messages_for_appointment(NEW.id, 'APPOINTMENT_REMINDER');
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao agendar mensagens WhatsApp para agendamento %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$function$;

-- 5. Modificar trigger de FINALIZAÇÃO para processar apenas POST_SERVICE_THANKS
CREATE OR REPLACE FUNCTION public.handle_appointment_completion_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Quando um agendamento é finalizado (status = 'concluido')
    -- e o status anterior não era 'concluido', agendar mensagem de agradecimento
    IF TG_OP = 'UPDATE' 
       AND NEW.status = 'concluido' 
       AND OLD.status != 'concluido' THEN
        
        BEGIN
            -- Processar apenas mensagens do tipo POST_SERVICE_THANKS (agradecimento após finalizar)
            PERFORM public.schedule_whatsapp_messages_for_appointment(NEW.id, 'POST_SERVICE_THANKS');
        EXCEPTION WHEN OTHERS THEN
            -- Logar erro mas não impedir a finalização
            RAISE WARNING 'Erro ao agendar mensagens WhatsApp pós-finalização para agendamento %: %', NEW.id, SQLERRM;
        END;
        
    END IF;

    RETURN NEW;
END;
$function$;

-- 6. Verificar triggers
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE tgenabled
        WHEN 'O' THEN '✅ ATIVO'
        ELSE '❌ DESABILITADO'
    END as status
FROM pg_trigger
WHERE tgname IN ('trg_appointment_creation_whatsapp', 'trg_appointment_completion_whatsapp');

-- =====================================================
-- RESUMO DA CORREÇÃO
-- =====================================================
-- 1. ✅ Criado tipo POST_SERVICE_THANKS
-- 2. ✅ Função modificada para filtrar por tipo de mensagem
-- 3. ✅ Trigger INSERT processa apenas APPOINTMENT_REMINDER
-- 4. ✅ Trigger UPDATE (concluido) processa apenas POST_SERVICE_THANKS
-- =====================================================










