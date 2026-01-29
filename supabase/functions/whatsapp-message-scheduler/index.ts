import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

// Esta função deve ser chamada periodicamente (cron) pelo Supabase
// para identificar mensagens pendentes e dispará-las via provedor de WhatsApp.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type MessageKindRow = {
  id: string;
  code: string;
};

type CompanyRow = {
  id: string;
  whatsapp_messaging_enabled: boolean;
};

type CompanyScheduleRow = {
  id: string;
  company_id: string;
  message_kind_id: string;
  channel: string;
  offset_value: number;
  offset_unit: 'MINUTES' | 'HOURS' | 'DAYS';
  reference: 'APPOINTMENT_START' | 'APPOINTMENT_CREATION';
};

type AppointmentRow = {
  id: string;
  company_id: string;
  client_id: string | null;
  appointment_date: string; // 'YYYY-MM-DD'
  appointment_time: string; // 'HH:MM:SS' ou 'HH:MM'
  status: string | null;
};

type ClientRow = {
  id: string;
  name: string | null;
  phone: string | null;
};

type CompanyTemplateRow = {
  id: string;
  company_id: string;
  message_kind_id: string;
  channel: string;
  body_template: string;
  is_active: boolean;
};

type MessagingProviderRow = {
  id: string;
  name: string;
  channel: string;
  base_url: string;
  http_method: 'GET' | 'POST' | 'PUT';
  auth_key: string | null;
  auth_token: string | null;
  payload_template: any;
  content_type?: string | null; // 'json' ou 'form-data'
  user_id: string | null;
  queue_id: string | null;
};

type MessageSendLogRow = {
  id: string;
  company_id: string;
  client_id: string | null;
  appointment_id: string | null;
  message_kind_id: string;
  channel: string;
  template_id: string | null;
  provider_id: string | null;
  scheduled_for: string;
  sent_at: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
};

function addOffsetToDate(base: Date, value: number, unit: 'MINUTES' | 'HOURS' | 'DAYS'): Date {
  const d = new Date(base);
  const before = d.toISOString();
  
  if (unit === 'MINUTES') {
    d.setMinutes(d.getMinutes() + value);
  } else if (unit === 'HOURS') {
    d.setHours(d.getHours() + value);
  } else if (unit === 'DAYS') {
    d.setDate(d.getDate() + value);
  }
  
  console.log(`addOffsetToDate: base=${before}, value=${value}, unit=${unit}, result=${d.toISOString()}`);
  
  return d;
}

function buildAppointmentReferenceDate(appointment: AppointmentRow, reference: 'APPOINTMENT_START' | 'APPOINTMENT_CREATION'): Date | null {
  // Por enquanto só implementamos APPOINTMENT_START (data + hora do atendimento)
  if (reference === 'APPOINTMENT_START') {
    // Garantir que appointment_time está no formato correto (HH:mm ou HH:mm:ss)
    const timeStr = appointment.appointment_time.length >= 5 
      ? appointment.appointment_time.substring(0, 5) 
      : appointment.appointment_time;
    
    // CRÍTICO: O horário do agendamento está em HORÁRIO DE BRASÍLIA
    // appointment_date vem como 'YYYY-MM-DD' e appointment_time como 'HH:mm'
    // Brasília é UTC-3, então precisamos criar a data assumindo que é horário de Brasília
    const [year, month, day] = appointment.appointment_date.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    
    // Criar string ISO assumindo que é horário de Brasília (UTC-3)
    // Formato: YYYY-MM-DDTHH:mm:00-03:00
    const dateTimeStringBR = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`;
    
    // Criar Date object - isso automaticamente converte para UTC internamente
    const dt = new Date(dateTimeStringBR);
    
    if (isNaN(dt.getTime())) {
      console.error(`❌ Erro ao construir data para appointment ${appointment.id}:`, {
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        timeStr,
        dateTimeStringBR,
        year, month, day, hour, minute,
      });
      return null;
    }
    
    // Verificar se a conversão está correta
    const horaBR = dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const dataBR = dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
    
    console.log(`buildAppointmentReferenceDate para appointment ${appointment.id}:`, {
      input: {
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        timeStr,
      },
      construido: {
        dateTimeStringBR,
        isoString: dt.toISOString(),
        timestamp: dt.getTime(),
      },
      verificado_brasilia: {
        data: dataBR,
        hora: horaBR,
        deve_ser: `${appointment.appointment_date} ${timeStr}`,
      },
    });
    
    return dt;
  }

  // TODO: implementar APPOINTMENT_CREATION se/quando existir campo específico de criação.
  return null;
}

function formatPhoneToE164Brazil(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  // Assume DDD + número. Se não tiver DDI, prefixa +55.
  if (digits.startsWith('55')) {
    return `+${digits}`;
  }
  return `+55${digits}`;
}

// Função para converter Date para string em horário de Brasília (formato ISO com timezone)
function toBrasiliaISOString(date: Date): string {
  // Obter componentes da data em horário de Brasília usando Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  const second = parts.find(p => p.type === 'second')?.value || '';
  
  // Formato: YYYY-MM-DDTHH:mm:ss-03:00 (horário de Brasília)
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}-03:00`;
}

function applyTemplate(template: string, params: Record<string, string | undefined | null>): string {
  let result = template;
  Object.entries(params).forEach(([key, value]) => {
    const safe = value ?? '';
    const pattern = new RegExp(`\\[${key}\\]`, 'g');
    result = result.replace(pattern, safe);
  });
  return result;
}

async function sendViaProvider(
  provider: MessagingProviderRow,
  toPhone: string,
  text: string,
): Promise<{ ok: boolean; status: number; responseBody: any }> {
  // Criar cópia do payload_template e incluir user_id e queue_id automaticamente
  const payloadTemplate = { ...(provider.payload_template || {}) };
  
  // Incluir user_id e queue_id do provedor (valores do provedor têm prioridade sobre o template)
  // Se o provedor tiver valores configurados, eles substituem os do template
  if (provider.user_id) {
    payloadTemplate.userId = provider.user_id;
  } else if (!payloadTemplate.userId) {
    payloadTemplate.userId = '';
  }
  
  if (provider.queue_id) {
    payloadTemplate.queueId = provider.queue_id;
  } else if (!payloadTemplate.queueId) {
    payloadTemplate.queueId = '';
  }
  
  const contentType = provider.content_type || 'json';

  const headers: Record<string, string> = {};

  // Adicionar header de autenticação
  if (provider.auth_key && provider.auth_token) {
    headers[provider.auth_key] = provider.auth_token;
  }

  let body: string | FormData | undefined;

  if (contentType === 'form-data') {
    // Usar multipart/form-data
    const formData = new FormData();
    
    // Processar o template como objeto e adicionar campos ao FormData
    for (const [key, value] of Object.entries(payloadTemplate)) {
      let fieldValue: string;
      
      if (typeof value === 'string') {
        // Substituir placeholders
        fieldValue = value
          .replace(/{phone}/g, toPhone)
          .replace(/{text}/g, text)
          .replace(/\[PHONE\]/g, toPhone)
          .replace(/\[TEXT\]/g, text);
      } else if (typeof value === 'boolean') {
        // Converter boolean para string
        fieldValue = String(value);
      } else if (value === null || value === undefined) {
        // Ignorar valores null/undefined
        continue;
      } else {
        fieldValue = String(value);
      }
      
      // Campos vazios (string vazia) são ignorados (conforme API LiotPRO)
      // Mas valores booleanos false devem ser enviados
      if (fieldValue !== '""' && fieldValue !== '') {
        formData.append(key, fieldValue);
      }
    }
    
    // Não definir Content-Type manualmente para FormData (Deno define automaticamente com boundary)
    body = formData;
  } else {
    // Usar application/json (padrão)
    headers['Content-Type'] = 'application/json';
    
    // Substituir placeholders básicos no JSON do payload
    const payloadString = JSON.stringify(payloadTemplate)
      .replace(/{phone}/g, toPhone)
      .replace(/{text}/g, text)
      .replace(/\[PHONE\]/g, toPhone)
      .replace(/\[TEXT\]/g, text);

    const payloadJson = JSON.parse(payloadString);
    body = provider.http_method === 'GET' ? undefined : JSON.stringify(payloadJson);
  }

  console.log(`sendViaProvider: Preparando requisição para: ${provider.base_url}`);
  console.log(`sendViaProvider: Método HTTP: ${provider.http_method}`);
  console.log(`sendViaProvider: Headers: ${JSON.stringify(headers)}`);
  console.log(`sendViaProvider: Content-Type para body: ${contentType}`);

  // Se o body for FormData, não podemos logar diretamente antes de enviar
  // mas podemos logar os campos que estão sendo adicionados ao formData
  if (contentType === 'form-data') {
    console.log(`sendViaProvider: Body como FormData (campos processados):`, 
      Object.fromEntries((body as FormData).entries())
    );
  } else {
    console.log(`sendViaProvider: Body como JSON:`, body);
  }

  const res = await fetch(provider.base_url, {
    method: provider.http_method,
    headers,
    body: body,
  });

  let responseBody: any = null;
  try {
    responseBody = await res.json();
  } catch {
    responseBody = await res.text().catch(() => null);
  }

  console.log(`sendViaProvider: Resposta da API - Status: ${res.status}`);
  console.log(`sendViaProvider: Resposta da API - OK: ${res.ok}`);
  console.log(`sendViaProvider: Resposta da API - Body:`, responseBody);

  return {
    ok: res.ok,
    status: res.status,
    responseBody: responseBody,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Permitir apenas POST para execução manual/cron
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Use POST para executar o agendador de mensagens.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  // IMPORTANTE: Trabalhar sempre com horário de BRASÍLIA
  // Obter hora atual em Brasília
  const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const now = new Date(); // UTC para comparações
  const nowMinus5 = new Date(now.getTime() - 5 * 60 * 1000); // tolerância de 5 minutos
  const nowPlus5 = new Date(now.getTime() + 5 * 60 * 1000);

  console.log('=== whatsapp-message-scheduler INICIADO ===');
  console.log('Timestamp (UTC):', now.toISOString());
  console.log('Timestamp (Brasília):', nowBR.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  console.log('Janela de busca (UTC):', {
    now: now.toISOString(),
    nowMinus5: nowMinus5.toISOString(),
    nowPlus5: nowPlus5.toISOString(),
  });
  console.log('Janela de busca (Brasília):', {
    now: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    nowMinus5: nowMinus5.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    nowPlus5: nowPlus5.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  });

  console.log('=== whatsapp-message-scheduler INICIADO ===');
  console.log('Timestamp:', now.toISOString());
  console.log('Janela de busca:', {
    now: now.toISOString(),
    nowMinus5: nowMinus5.toISOString(),
    nowPlus5: nowPlus5.toISOString(),
  });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    console.log('1) Buscando empresas com whatsapp_messaging_enabled = true...');
    // 1) Buscar empresas com módulo habilitado
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from<CompanyRow>('companies')
      .select('id, whatsapp_messaging_enabled')
      .eq('whatsapp_messaging_enabled', true);

    if (companiesError) {
      console.error('Erro ao buscar companies:', companiesError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar empresas.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (companiesError) {
      console.error('ERRO ao buscar companies:', companiesError);
    } else {
      console.log(`1) Empresas encontradas: ${companies?.length || 0}`, companies?.map(c => c.id));
    }

    if (!companies || companies.length === 0) {
      console.log('❌ Nenhuma empresa com whatsapp_messaging_enabled = true.');
      return new Response(JSON.stringify({ message: 'Nenhuma empresa habilitada.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('2) Buscando provedor de WhatsApp ativo...');
    // 2) Buscar provedor de WhatsApp ativo (global)
    const { data: providers, error: providersError } = await supabaseAdmin
      .from<MessagingProviderRow>('messaging_providers')
      .select('*')
      .eq('channel', 'WHATSAPP')
      .eq('is_active', true)
      .limit(1);

    if (providersError) {
      console.error('Erro ao buscar messaging_providers:', providersError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar provedor de mensagens.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const provider = providers && providers[0];

    if (providersError) {
      console.error('ERRO ao buscar providers:', providersError);
    } else {
      console.log(`2) Provedores encontrados: ${providers?.length || 0}`);
    }

    if (!provider) {
      console.warn('❌ Nenhum provedor WHATSAPP ativo encontrado em messaging_providers.');
      return new Response(JSON.stringify({ error: 'Nenhum provedor WHATSAPP ativo configurado.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('3) Buscando schedules (regras de envio)...');
    // 3) Buscar schedules por empresa / tipo de mensagem
    const companyIds = companies.map((c) => c.id);

    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from<CompanyScheduleRow>('company_message_schedules')
      .select('*')
      .in('company_id', companyIds)
      .eq('channel', 'WHATSAPP')
      .eq('is_active', true);

    if (schedulesError) {
      console.error('Erro ao buscar company_message_schedules:', schedulesError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar regras de envio.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (schedulesError) {
      console.error('ERRO ao buscar schedules:', schedulesError);
    } else {
      console.log(`3) Schedules encontrados: ${schedules?.length || 0}`, schedules?.map(s => ({
        id: s.id,
        company_id: s.company_id,
        message_kind_id: s.message_kind_id,
        offset_value: s.offset_value,
        offset_unit: s.offset_unit,
      })));
    }

    if (!schedules || schedules.length === 0) {
      console.log('❌ Nenhuma regra de envio ativa encontrada.');
      return new Response(JSON.stringify({ message: 'Nenhuma regra de envio ativa.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('4) Buscando templates de mensagem...');
    // 4) Buscar templates (por empresa/mensagem)
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from<CompanyTemplateRow>('company_message_templates')
      .select('*')
      .in('company_id', companyIds)
      .eq('channel', 'WHATSAPP')
      .eq('is_active', true);

    if (templatesError) {
      console.error('Erro ao buscar company_message_templates:', templatesError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar templates de mensagem.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const templatesByCompanyAndKind = new Map<string, CompanyTemplateRow>();
    (templates || []).forEach((t) => {
      templatesByCompanyAndKind.set(`${t.company_id}_${t.message_kind_id}`, t);
    });

    if (templatesError) {
      console.error('ERRO ao buscar templates:', templatesError);
    } else {
      console.log(`4) Templates encontrados: ${templates?.length || 0}`);
    }

    console.log('5) Processando schedules e buscando agendamentos...');
    // 5) Para cada empresa/regra, descobrir agendamentos que caem na janela de envio
    const pendingLogsToInsert: Omit<MessageSendLogRow, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const schedule of schedules!) {
      console.log(`Processando schedule ${schedule.id} para company ${schedule.company_id}`);
      const companyId = schedule.company_id;

      // Apenas APPOINTMENT_START implementado por enquanto
      if (schedule.reference !== 'APPOINTMENT_START') {
        continue;
      }

      // Vamos procurar agendamentos cujo horário de início, somado ao offset, caia entre nowMinus5 e nowPlus5
      // Isso exige um range de datas razoável. Aqui vamos pegar agendamentos de hoje - 7 dias até hoje + 7 dias,
      // o que é suficiente para lembretes antes do atendimento.

      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() - 7);

      const windowEnd = new Date(now);
      windowEnd.setDate(windowEnd.getDate() + 7);

      const { data: appointments, error: appointmentsError } = await supabaseAdmin
        .from<AppointmentRow>('appointments')
        .select('id, company_id, client_id, appointment_date, appointment_time, status')
        .eq('company_id', companyId)
        .neq('status', 'cancelado')
        .gte('appointment_date', windowStart.toISOString().slice(0, 10))
        .lte('appointment_date', windowEnd.toISOString().slice(0, 10));

      if (appointmentsError) {
        console.error('Erro ao buscar appointments para company', companyId, appointmentsError);
        continue;
      }

      if (!appointments || appointments.length === 0) {
        continue;
      }

      // Buscar telefones dos clientes dos agendamentos para validar antes de criar logs
      const appointmentClientIds = Array.from(
        new Set(appointments.map((a) => a.client_id).filter((id): id is string => !!id)),
      );

      let clientsPhoneMap = new Map<string, string | null>();
      if (appointmentClientIds.length > 0) {
        const { data: appointmentClients, error: clientsPhoneError } = await supabaseAdmin
          .from<ClientRow>('clients')
          .select('id, phone')
          .in('id', appointmentClientIds);

        if (clientsPhoneError) {
          console.error('Erro ao buscar telefones dos clientes:', clientsPhoneError);
        } else if (appointmentClients) {
          appointmentClients.forEach((c) => {
            clientsPhoneMap.set(c.id, c.phone);
          });
        }
      }

      for (const appointment of appointments) {
        // Validar se o cliente tem telefone antes de criar o log
        if (appointment.client_id) {
          const clientPhone = clientsPhoneMap.get(appointment.client_id);
          const formattedPhone = formatPhoneToE164Brazil(clientPhone || null);
          
          if (!formattedPhone) {
            console.warn(
              `Pulando agendamento ${appointment.id}: Cliente ${appointment.client_id} não possui telefone válido cadastrado.`,
            );
            continue; // Não cria log para clientes sem telefone
          }
        }

        const referenceDate = buildAppointmentReferenceDate(appointment, 'APPOINTMENT_START');
        if (!referenceDate) {
          console.warn(`Não foi possível construir referenceDate para appointment ${appointment.id}`);
          continue;
        }

        const scheduledFor = addOffsetToDate(referenceDate, schedule.offset_value, schedule.offset_unit);
        
        // Converter para horário de Brasília para exibição
        const referenceDateBR = referenceDate.toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const scheduledForBR = scheduledFor.toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const nowBR = now.toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        console.log(`Verificando appointment ${appointment.id}:`, {
          input: {
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            offset_value: schedule.offset_value,
            offset_unit: schedule.offset_unit,
          },
          horarios_brasilia: {
            referencia: referenceDateBR,
            agendado_para: scheduledForBR,
            agora: nowBR,
          },
          horarios_utc: {
            referenceDate: referenceDate.toISOString(),
            scheduledFor: scheduledFor.toISOString(),
            now: now.toISOString(),
            nowMinus5: nowMinus5.toISOString(),
            nowPlus5: nowPlus5.toISOString(),
          },
          isInWindow: scheduledFor >= nowMinus5 && scheduledFor <= nowPlus5,
        });

        if (scheduledFor >= nowMinus5 && scheduledFor <= nowPlus5) {
          // Verificar se já existe log PENDING/SENT para este appointment + message_kind + channel nesta hora (para evitar duplicidade)
          // IMPORTANTE: scheduled_for está em horário de BRASÍLIA
          const scheduledForBRString = toBrasiliaISOString(scheduledFor);
          const scheduledForMinus5BR = toBrasiliaISOString(new Date(scheduledFor.getTime() - 5 * 60 * 1000));
          const scheduledForPlus5BR = toBrasiliaISOString(new Date(scheduledFor.getTime() + 5 * 60 * 1000));
          
          const { data: existingLogs, error: existingLogsError } = await supabaseAdmin
            .from<MessageSendLogRow>('message_send_log')
            .select('id')
            .eq('company_id', companyId)
            .eq('appointment_id', appointment.id)
            .eq('message_kind_id', schedule.message_kind_id)
            .eq('channel', 'WHATSAPP')
            .gte('scheduled_for', scheduledForMinus5BR) // Comparar com horário de Brasília
            .lte('scheduled_for', scheduledForPlus5BR)   // Comparar com horário de Brasília
            .limit(1);

          if (existingLogsError) {
            console.error('Erro ao verificar logs existentes:', existingLogsError);
            continue;
          }

          if (existingLogs && existingLogs.length > 0) {
            continue;
          }

          // IMPORTANTE: Salvar scheduled_for em horário de BRASÍLIA (não UTC)
          const scheduledForBR = toBrasiliaISOString(scheduledFor);
          
          console.log(`Criando log para appointment ${appointment.id}:`, {
            scheduledFor_UTC: scheduledFor.toISOString(),
            scheduledFor_BR: scheduledForBR,
            scheduledFor_BR_display: scheduledFor.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          });
          
          pendingLogsToInsert.push({
            company_id: companyId,
            client_id: appointment.client_id,
            appointment_id: appointment.id,
            message_kind_id: schedule.message_kind_id,
            channel: 'WHATSAPP',
            template_id: templatesByCompanyAndKind.get(`${companyId}_${schedule.message_kind_id}`)?.id ?? null,
            provider_id: provider.id,
            scheduled_for: scheduledForBR, // Salvar em horário de Brasília
            sent_at: null,
            status: 'PENDING',
          });
        }
      }
    }

    console.log(`6) Total de logs a inserir: ${pendingLogsToInsert.length}`);
    
    // 6) Inserir logs PENDING
    let insertedLogs: any[] = [];
    if (pendingLogsToInsert.length > 0) {
      console.log('Inserindo logs na tabela message_send_log...', pendingLogsToInsert.map(l => ({
        appointment_id: l.appointment_id,
        scheduled_for: l.scheduled_for,
        message_kind_id: l.message_kind_id,
      })));
      
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('message_send_log')
        .insert(pendingLogsToInsert)
        .select('*');

      if (insertError) {
        console.error('❌ ERRO ao inserir message_send_log:', insertError);
      } else {
        insertedLogs = inserted || [];
        console.log(`✅ Logs inseridos com sucesso: ${insertedLogs.length}`);
      }
    } else {
      console.log('⚠️ Nenhum log para inserir. Verifique:');
      console.log('  - Se há agendamentos na janela de tempo');
      console.log('  - Se os clientes têm telefone cadastrado');
      console.log('  - Se os schedules estão configurados corretamente');
    }

    // 7) Buscar logs PENDING vencidos para envio agora
    // IMPORTANTE: scheduled_for está em horário de BRASÍLIA, então precisamos converter now para Brasília também
    const nowBRString = toBrasiliaISOString(now);
    const nowPlus5BRString = toBrasiliaISOString(nowPlus5);
    
    console.log('Buscando logs PENDING:', {
      now_UTC: now.toISOString(),
      now_BR: nowBRString,
      nowPlus5_UTC: nowPlus5.toISOString(),
      nowPlus5_BR: nowPlus5BRString,
    });
    
    const { data: pendingLogs, error: pendingError } = await supabaseAdmin
      .from<MessageSendLogRow>('message_send_log')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_for', nowPlus5BRString); // Comparar com horário de Brasília

    if (pendingError) {
      console.error('Erro ao buscar logs pendentes para envio:', pendingError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar logs pendentes.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      console.log('Nenhuma mensagem PENDING para envio.');
      return new Response(
        JSON.stringify({
          message: 'Execução concluída sem mensagens a enviar.',
          insertedLogsCount: insertedLogs.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Buscar dados adicionais de clientes e empresas para preencher templates
    const clientIds = Array.from(
      new Set(pendingLogs.map((l) => l.client_id).filter((id): id is string => !!id)),
    );

    const { data: clients, error: clientsError } = await supabaseAdmin
      .from<ClientRow>('clients')
      .select('id, name, phone')
      .in('id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000']); // hack para evitar erro se vazio

    if (clientsError) {
      console.error('Erro ao buscar clients:', clientsError);
    }

    const companiesMap = new Map<string, CompanyRow>();
    companies.forEach((c) => companiesMap.set(c.id, c));

    const clientsMap = new Map<string, ClientRow>();
    (clients || []).forEach((c) => clientsMap.set(c.id, c));

    // Reaproveitar templates map

    const updates: any[] = [];

    for (const log of pendingLogs) {
      const client = log.client_id ? clientsMap.get(log.client_id) : null;
      const template =
        templatesByCompanyAndKind.get(`${log.company_id}_${log.message_kind_id}`) || null;

      const rawPhone = client?.phone || null;
      const formattedPhone = formatPhoneToE164Brazil(rawPhone);

      if (!formattedPhone) {
        console.warn(
          'Telefone inválido ou ausente para client_id',
          log.client_id,
          'company_id',
          log.company_id,
        );
        updates.push({
          id: log.id,
          status: 'FAILED',
          sent_at: new Date().toISOString(),
          provider_response: { error: 'Telefone inválido ou ausente' },
        });
        continue;
      }

      const bodyTemplate = template?.body_template || 'Olá, [CLIENTE]! [EMPRESA]';

      // TODO: buscar mais dados de appointment / empresa se precisar para [DATA_HORA], [EMPRESA], etc.
      const renderedText = applyTemplate(bodyTemplate, {
        CLIENTE: client?.name || '',
        EMPRESA: '', // preencher quando tivermos o nome da empresa disponível aqui
        DATA_HORA: '', // preencher quando buscarmos appointment detalhado, se necessário
      });

      const sendResult = await sendViaProvider(provider, formattedPhone, renderedText);

      updates.push({
        id: log.id,
        status: sendResult.ok ? 'SENT' : 'FAILED',
        sent_at: new Date().toISOString(),
        provider_response: sendResult.responseBody,
      });
    }

    // 8) Atualizar logs com status SENT/FAILED
    if (updates.length > 0) {
      // Supabase não permite update em lote com array direto; fazemos 1 a 1
      for (const u of updates) {
        const { error: updateError } = await supabaseAdmin
          .from('message_send_log')
          .update({
            status: u.status,
            sent_at: u.sent_at,
            provider_response: u.provider_response,
          })
          .eq('id', u.id);

        if (updateError) {
          console.error('Erro ao atualizar message_send_log', u.id, updateError);
        }
      }
    }

    const sentCount = updates.filter((u) => u.status === 'SENT').length;
    const failedCount = updates.filter((u) => u.status === 'FAILED').length;
    
    console.log('=== RESUMO DA EXECUÇÃO ===');
    console.log(`Logs inseridos na tabela: ${insertedLogs.length}`);
    console.log(`Logs processados: ${updates.length}`);
    console.log(`Logs enviados com sucesso: ${sentCount}`);
    console.log(`Logs com falha: ${failedCount}`);
    console.log('=== FIM DA EXECUÇÃO ===');

    return new Response(
      JSON.stringify({
        message: 'Agendador de mensagens executado com sucesso.',
        insertedLogsCount: insertedLogs.length,
        processedLogsCount: updates.length,
        sentCount,
        failedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO na Edge Function:', error);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    return new Response(JSON.stringify({ error: 'Erro interno: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


