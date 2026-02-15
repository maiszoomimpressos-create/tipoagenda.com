-- =====================================================
-- CORRIGIR FUNÇÃO SQL schedule_whatsapp_messages_for_appointment
-- =====================================================
-- Execute este SQL para corrigir o erro "has no field created_at"
-- =====================================================

-- Corrigir a função adicionando created_at no SELECT
CREATE OR REPLACE FUNCTION public.schedule_whatsapp_messages_for_appointment(
    p_appointment_id UUID
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
    v_schedules RECORD;
    v_template RECORD;
    v_provider RECORD;
    v_message_kind RECORD;
    v_scheduled_for TIMESTAMPTZ;
    v_reference_date TIMESTAMPTZ;
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
BEGIN
    -- 1. Buscar dados do agendamento (AGORA COM created_at)
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

    -- 2. Buscar dados da empresa
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
            'message', 'WhatsApp messaging está desabilitado para esta empresa.',
            'logs_created', 0,
            'logs_skipped', 0,
            'errors', ARRAY['WhatsApp messaging desabilitado']
        );
    END IF;

    -- 3. Buscar dados do cliente
    SELECT 
        cl.id,
        cl.name,
        cl.phone
    INTO v_client
    FROM clients cl
    WHERE cl.id = v_appointment.client_id;

    IF v_client.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Cliente não encontrado.'
        );
    END IF;

    -- Validar se o telefone não é um placeholder inválido (00000000000, etc)
    -- Remover todos os caracteres não numéricos
    v_phone_digits := REGEXP_REPLACE(v_client.phone, '[^0-9]', '', 'g');
    
    -- Validar: deve ter pelo menos 10 dígitos e não ser apenas zeros
    -- Aceitar telefones válidos brasileiros (com ou sem DDI 55)
    IF LENGTH(v_phone_digits) >= 10 THEN
        -- Rejeitar apenas se for COMPLETAMENTE zeros (placeholder)
        -- Aceitar qualquer telefone que tenha pelo menos um dígito diferente de zero
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
            'errors', ARRAY['Telefone inválido: ' || v_client.phone || ' (após limpeza: ' || COALESCE(v_phone_digits, 'NULL') || ') - Telefone é apenas zeros (placeholder)']
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
    -- DEBUG: Verificar quantas regras existem
    SELECT COUNT(*) INTO v_total_schedules
    FROM company_message_schedules cms
    WHERE cms.company_id = v_appointment.company_id
      AND cms.channel = 'WHATSAPP'
      AND cms.is_active = TRUE;
    
    IF v_total_schedules = 0 THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'Nenhuma regra de envio ativa encontrada para esta empresa.',
            'logs_created', 0,
            'logs_skipped', 0,
            'errors', ARRAY['Nenhuma regra de envio ativa encontrada']
        );
    END IF;

    FOR v_schedules IN
        SELECT 
            cms.id,
            cms.message_kind_id,
            cms.offset_value,
            cms.offset_unit,
            cms.reference
        FROM company_message_schedules cms
        WHERE cms.company_id = v_appointment.company_id
          AND cms.channel = 'WHATSAPP'
          AND cms.is_active = TRUE
          -- Removido filtro de reference para iterar sobre todas as regras ativas
    LOOP
        BEGIN
            -- 7. Calcular data/hora de referência (início do agendamento ou criação)
            IF v_schedules.reference = 'APPOINTMENT_START' THEN
                -- Lógica existente para APPOINTMENT_START
                -- O appointment_date vem como 'YYYY-MM-DD' e appointment_time como 'HH:mm' ou 'HH:mm:ss'
                -- Assumimos que está em horário de Brasília (UTC-3)
                -- Extrair apenas HH:mm do appointment_time (convertendo TIME para TEXT primeiro)
                v_time_str := SUBSTRING(v_appointment.appointment_time::TEXT FROM 1 FOR 5);
                
                -- Extrair componentes da data
                v_year := EXTRACT(YEAR FROM v_appointment.appointment_date::DATE);
                v_month := EXTRACT(MONTH FROM v_appointment.appointment_date::DATE);
                v_day := EXTRACT(DAY FROM v_appointment.appointment_date::DATE);
                v_hour := CAST(SPLIT_PART(v_time_str, ':', 1) AS INTEGER);
                v_minute := CAST(SPLIT_PART(v_time_str, ':', 2) AS INTEGER);
                
                -- Criar timestamp em horário de Brasília (UTC-3)
                -- Formato: YYYY-MM-DDTHH:mm:00-03:00
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
                -- Usar created_at como referência para APPOINTMENT_CREATION
                v_reference_date := v_appointment.created_at;
            ELSE
                -- Caso de referência não tratada (para futura expansão)
                v_errors := array_append(v_errors, 'Tipo de referência de agendamento não tratado: ' || v_schedules.reference);
                v_logs_skipped := v_logs_skipped + 1;
                CONTINUE;
            END IF;

            -- 8. Calcular scheduled_for aplicando o offset
            -- IMPORTANTE: A Edge Function usa addOffsetToDate que ADICIONA o offset.
            -- Se offset_value for negativo, será subtraído automaticamente.
            -- Se offset_value for positivo, será adicionado.
            -- Isso permite que lembretes usem offset negativo (antes) e agradecimentos usem offset positivo (depois).
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
                    v_errors := array_append(v_errors, 'Unidade de offset inválida: ' || v_offset_unit);
                    v_logs_skipped := v_logs_skipped + 1;
                    CONTINUE;
            END CASE;

            -- 9. Remover logs antigos para este appointment + message_kind (se existirem)
            -- Isso garante que sempre teremos um log atualizado
            DELETE FROM message_send_log
            WHERE appointment_id = p_appointment_id
              AND message_kind_id = v_schedules.message_kind_id
              AND channel = 'WHATSAPP'
              AND status IN ('PENDING', 'CANCELLED', 'FAILED'); -- Remove apenas pendentes, cancelados ou falhados

            -- 10. Buscar template ativo para esta empresa e tipo de mensagem
            SELECT 
                cmt.id
            INTO v_template
            FROM company_message_templates cmt
            WHERE cmt.company_id = v_appointment.company_id
              AND cmt.message_kind_id = v_schedules.message_kind_id
              AND cmt.channel = 'WHATSAPP'
              AND cmt.is_active = TRUE
            LIMIT 1;

            -- 11. Inserir log na message_send_log
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
                p_appointment_id,
                v_schedules.message_kind_id,
                'WHATSAPP',
                v_template.id, -- Pode ser NULL se não houver template
                v_provider.id,
                v_scheduled_for,
                NULL,
                'PENDING'
            );

            v_logs_created := v_logs_created + 1;

        EXCEPTION
            WHEN OTHERS THEN
                v_errors := array_append(v_errors, 
                    'Erro ao criar log para message_kind ' || COALESCE(v_schedules.message_kind_id::TEXT, 'NULL') || 
                    ': ' || SQLERRM || 
                    ' (SQLSTATE: ' || SQLSTATE || ')'
                );
                v_logs_skipped := v_logs_skipped + 1;
                -- Continuar para próxima regra mesmo com erro
        END;
    END LOOP;

    -- 12. Retornar resultado com informações detalhadas
    RETURN jsonb_build_object(
        'success', TRUE,
        'message', CASE 
            WHEN v_logs_created > 0 THEN 'Processamento concluído com sucesso.'
            WHEN v_logs_skipped > 0 AND array_length(v_errors, 1) > 0 THEN 'Nenhum log criado. Verifique os erros.'
            WHEN v_logs_skipped > 0 THEN 'Nenhum log criado. Verifique as condições (regras, templates, etc).'
            ELSE 'Processamento concluído, mas nenhum log foi criado.'
        END,
        'logs_created', v_logs_created,
        'logs_skipped', v_logs_skipped,
        'errors', v_errors,
        'debug_info', jsonb_build_object(
            'has_provider', v_provider.id IS NOT NULL,
            'appointment_id', p_appointment_id::TEXT,
            'has_valid_phone', v_phone_valid,
            'total_schedules_found', v_total_schedules
        )
    );
END;
$function$;

-- =====================================================
-- FIM DA CORREÇÃO
-- =====================================================
-- Agora execute novamente a função para os agendamentos sem logs:
-- SELECT public.schedule_whatsapp_messages_for_appointment('17e92d3a-9d3c-46f2-a40b-4ca5ee6b1aa2'::UUID);
-- =====================================================

