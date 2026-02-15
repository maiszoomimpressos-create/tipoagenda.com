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
  name: string | null;
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
  // Formatar telefone para API LiotPRO: remover "+" e espaços, apenas dígitos
  // A API espera formato: "558599999999" (sem +, sem espaços)
  const formattedPhoneForAPI = toPhone.replace(/[+\s]/g, '');
  
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
    // Garantir que o token tenha prefixo "Bearer " se necessário
    let tokenValue = provider.auth_token;
    if (provider.auth_key.toLowerCase() === 'authorization' && !tokenValue.startsWith('Bearer ')) {
      tokenValue = 'Bearer ' + tokenValue;
    }
    headers[provider.auth_key] = tokenValue;
  }

  let body: string | FormData | undefined;

  if (contentType === 'form-data') {
    // Usar multipart/form-data
    const formData = new FormData();
    
    // Processar o template como objeto e adicionar campos ao FormData
    for (const [key, value] of Object.entries(payloadTemplate)) {
      let fieldValue: string;
      
      if (typeof value === 'string') {
        // Substituir placeholders (usar telefone formatado sem +)
        fieldValue = value
          .replace(/{phone}/g, formattedPhoneForAPI)
          .replace(/{text}/g, text)
          .replace(/\[PHONE\]/g, formattedPhoneForAPI)
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
    
    // IMPORTANTE: Substituir placeholders ANTES de fazer JSON.stringify
    // para evitar problemas com caracteres de controle inválidos
    // Sanitizar o texto: remover caracteres de controle inválidos e escapar quebras de linha
    const sanitizedText = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de controle inválidos (mantém \n, \r, \t)
      .replace(/\r\n/g, '\n') // Normalizar quebras de linha
      .replace(/\r/g, '\n'); // Converter \r para \n
    
    // Função recursiva para substituir placeholders em objetos aninhados
    const replacePlaceholders = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj
          .replace(/{phone}/g, formattedPhoneForAPI)
          .replace(/{text}/g, sanitizedText)
          .replace(/\[PHONE\]/g, formattedPhoneForAPI)
          .replace(/\[TEXT\]/g, sanitizedText);
      } else if (Array.isArray(obj)) {
        return obj.map(item => replacePlaceholders(item));
      } else if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = replacePlaceholders(obj[key]);
        }
        return result;
      }
      return obj;
    };
    
    // Substituir placeholders no objeto (cópia profunda)
    const payloadJson = replacePlaceholders(JSON.parse(JSON.stringify(payloadTemplate)));
    
    try {
      body = provider.http_method === 'GET' ? undefined : JSON.stringify(payloadJson);
    } catch (e) {
      console.error('❌ Erro ao fazer JSON.stringify do payload:', e);
      console.error('Payload (primeiros 500 chars):', JSON.stringify(payloadJson).substring(0, 500));
      throw new Error(`Erro ao serializar payload JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`sendViaProvider: Preparando requisição para: ${provider.base_url}`);
  console.log(`sendViaProvider: Telefone original: ${toPhone}`);
  console.log(`sendViaProvider: Telefone formatado para API (sem +): ${formattedPhoneForAPI}`);
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
  const startTime = Date.now();
  const executionId = crypto.randomUUID();
  
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

  // Verificar autenticação: deve ter Authorization header com service_role_key
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Acesso negado: Authorization header ausente ou inválido');
    return new Response(
      JSON.stringify({ error: 'Acesso negado. Authorization header requerido.' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  
  const providedKey = authHeader.replace('Bearer ', '');
  
  // Obter chave esperada: primeiro tenta variável de ambiente
  const envKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  // Verificar se a chave fornecida corresponde à variável de ambiente
  let isValid = false;
  
  if (envKey && envKey !== '' && providedKey === envKey) {
    isValid = true;
    console.log('✅ Service role key validada via variável de ambiente');
  } else {
    // Se não corresponde à variável de ambiente, verificar se a chave fornecida é válida
    // tentando ler a tabela app_config com ela (se conseguir ler, é uma service_role_key válida)
    try {
      const tempSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        providedKey, // Tentar usar a chave fornecida
        { auth: { persistSession: false } },
      );
      
      // Tentar ler a tabela app_config - se conseguir, a chave é válida
      const { data: config, error: configError } = await tempSupabase
        .from('app_config')
        .select('value')
        .eq('key', 'service_role_key')
        .single();
      
      if (!configError && config?.value) {
        // Se conseguiu ler a tabela, a chave é válida
        // Verificar se a chave fornecida corresponde à chave armazenada na tabela
        if (providedKey === config.value) {
          isValid = true;
          console.log('✅ Service role key validada via tabela app_config');
        } else {
          console.warn('⚠️ Chave fornecida não corresponde à chave na tabela app_config, mas é válida para leitura');
          // Mesmo assim, se conseguiu ler a tabela, a chave é válida (service_role)
          isValid = true;
        }
      } else {
        // Se não conseguiu ler, a chave pode não ser válida
        console.error('❌ Acesso negado: Service role key inválida (não conseguiu ler app_config)');
        console.error('Erro:', configError?.message || 'Erro desconhecido');
      }
    } catch (e) {
      console.error('❌ Acesso negado: Erro ao validar service role key:', e);
    }
  }
  
  if (!isValid) {
    console.error('❌ Acesso negado: Service role key inválida');
    console.error('Provided key length:', providedKey.length);
    console.error('Env key length:', envKey.length);
    return new Response(
      JSON.stringify({ error: 'Acesso negado. Service role key inválida.' }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
  
  console.log(`✅ Autenticação válida. Execution ID: ${executionId}`);

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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    console.log('1) Buscando empresas com whatsapp_messaging_enabled = true...');
    // 1) Buscar empresas com módulo habilitado (incluindo nome para templates)
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from<CompanyRow>('companies')
      .select('id, name, whatsapp_messaging_enabled')
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

    // 7) Buscar logs PENDING para envio
    // IMPORTANTE: Buscar apenas mensagens com scheduled_for <= NOW() (horário atual)
    // scheduled_for está armazenado como TIMESTAMPTZ no banco, então usamos UTC para comparação
    console.log('Buscando logs PENDING com scheduled_for <= NOW()...', {
      now_UTC: now.toISOString(),
      now_BR: nowBR.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    });
    
    // Primeiro, verificar quantas mensagens PENDING existem (para debug)
    const { count: pendingCount, error: countError } = await supabaseAdmin
      .from<MessageSendLogRow>('message_send_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
    
    console.log(`DEBUG: Total de mensagens PENDING no banco: ${pendingCount}`, {
      countError: countError?.message,
    });
    
    // Buscar apenas mensagens PENDING com scheduled_for <= NOW()
    // IMPORTANTE: scheduled_for é TIMESTAMPTZ no banco (armazenado em UTC)
    // Precisamos comparar corretamente, considerando que o Supabase pode retornar
    // scheduled_for como string ISO ou como Date object
    const nowISOString = now.toISOString();
    
    console.log(`DEBUG: Comparando scheduled_for <= ${nowISOString} (UTC)`);
    console.log(`DEBUG: now timestamp: ${now.getTime()}, now ISO: ${nowISOString}`);
    
    // Buscar mensagens PENDING que já deveriam ter sido enviadas
    // Usar .lte() que funciona com TIMESTAMPTZ no Supabase
    const { data: pendingLogs, error: pendingError } = await supabaseAdmin
      .from<MessageSendLogRow>('message_send_log')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_for', nowISOString); // Comparar com timestamp UTC
    
    // Se a query não retornou resultados, tentar buscar todas e filtrar manualmente
    // para garantir que não estamos perdendo mensagens por problemas de timezone

    console.log(`DEBUG: Mensagens PENDING encontradas pela query: ${pendingLogs?.length || 0}`, {
      pendingError: pendingError?.message,
      pendingErrorCode: pendingError?.code,
      pendingErrorDetails: pendingError?.details,
      nowISOString,
      pendingLogsDetails: pendingLogs?.map(l => ({
        id: l.id,
        scheduled_for: l.scheduled_for,
        status: l.status,
      })),
    });

    if (pendingError) {
      console.error('❌ ERRO ao buscar logs pendentes para envio:', pendingError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar logs pendentes.', details: pendingError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SEMPRE buscar todas as mensagens PENDING e filtrar manualmente para garantir
    // que não perdemos nenhuma mensagem devido a problemas de timezone ou formato
    let finalPendingLogs = pendingLogs || [];
    
    // Se a query inicial não retornou resultados OU se há mensagens PENDING no banco,
    // buscar todas e filtrar manualmente
    if (!finalPendingLogs || finalPendingLogs.length === 0 || (pendingCount && pendingCount > 0)) {
      console.log(`⚠️ Query inicial retornou ${finalPendingLogs.length} mensagens, mas há ${pendingCount || 0} PENDING no banco. Buscando todas para filtrar manualmente...`);
      
      // Buscar TODAS as mensagens PENDING
      const { data: allPending, error: allPendingError } = await supabaseAdmin
        .from<MessageSendLogRow>('message_send_log')
        .select('*')
        .eq('status', 'PENDING');
      
      if (allPendingError) {
        console.error('Erro ao buscar todas as mensagens PENDING:', allPendingError);
      } else if (allPending && allPending.length > 0) {
        console.log(`📋 Total de mensagens PENDING no banco: ${allPending.length}`);
        
        // Filtrar manualmente: mensagens com scheduled_for <= NOW()
        // IMPORTANTE: log.scheduled_for pode vir como string ISO ou já como Date
        const filtered = allPending.filter(log => {
          if (!log.scheduled_for) {
            console.warn(`⚠️ Mensagem ${log.id} não tem scheduled_for`);
            return false;
          }
          
          // Converter para Date se for string
          let scheduledDate: Date;
          try {
            scheduledDate = typeof log.scheduled_for === 'string' 
              ? new Date(log.scheduled_for) 
              : (log.scheduled_for instanceof Date ? log.scheduled_for : new Date(log.scheduled_for));
          } catch (e) {
            console.error(`❌ Erro ao converter scheduled_for para Date na mensagem ${log.id}:`, log.scheduled_for, e);
            return false;
          }
          
          // Verificar se a data é válida
          if (isNaN(scheduledDate.getTime())) {
            console.error(`❌ scheduled_for inválido na mensagem ${log.id}:`, log.scheduled_for);
            return false;
          }
          
          // Comparar timestamps (em milissegundos)
          const scheduledTime = scheduledDate.getTime();
          const nowTime = now.getTime();
          
          // Adicionar tolerância de 2 minutos para evitar problemas de precisão
          const isDue = scheduledTime <= (nowTime + 120000); // +2 minutos de tolerância
          
          if (isDue) {
            const diffMinutes = (nowTime - scheduledTime) / 60000;
            console.log(`✅ Mensagem ${log.id} está pronta para envio:`, {
              scheduled_for: log.scheduled_for,
              scheduledTime,
              scheduledDateISO: scheduledDate.toISOString(),
              nowTime,
              nowISO: now.toISOString(),
              diffMinutes: diffMinutes.toFixed(2),
              appointment_id: log.appointment_id,
            });
          } else {
            const diffMinutes = (scheduledTime - nowTime) / 60000;
            if (diffMinutes < 60) { // Log apenas se faltar menos de 1 hora
              console.log(`⏳ Mensagem ${log.id} ainda não é hora (faltam ${diffMinutes.toFixed(2)} minutos):`, {
                scheduled_for: log.scheduled_for,
                scheduledDateISO: scheduledDate.toISOString(),
                nowISO: now.toISOString(),
              });
            }
          }
          
          return isDue;
        });
        
        console.log(`✅ Filtradas ${filtered.length} mensagens prontas para envio de ${allPending.length} total`);
        
        if (filtered.length > 0) {
          finalPendingLogs = filtered;
        } else if (allPending.length > 0) {
          // Log detalhado das primeiras mensagens que não foram filtradas
          console.log(`⚠️ Nenhuma mensagem foi filtrada. Exemplos das primeiras 5:`);
          allPending.slice(0, 5).forEach(log => {
            const scheduledDate = typeof log.scheduled_for === 'string' 
              ? new Date(log.scheduled_for) 
              : (log.scheduled_for instanceof Date ? log.scheduled_for : new Date(log.scheduled_for));
            const diffMinutes = (scheduledDate.getTime() - now.getTime()) / 60000;
            console.log(`  - ${log.id}: scheduled_for=${log.scheduled_for}, diff=${diffMinutes.toFixed(2)} minutos`);
          });
        }
      }
    }
    
    if (!finalPendingLogs || finalPendingLogs.length === 0) {
      console.log(`⚠️ Nenhuma mensagem PENDING para envio. (Total no banco: ${pendingCount || 0})`);
      
      // Log adicional: verificar se há mensagens PENDING que não foram encontradas
      if (pendingCount && pendingCount > 0) {
        const { data: allPending, error: allPendingError } = await supabaseAdmin
          .from<MessageSendLogRow>('message_send_log')
          .select('id, scheduled_for, status')
          .eq('status', 'PENDING')
          .limit(5);
        
        console.log(`DEBUG: Exemplo de mensagens PENDING no banco (primeiras 5):`, {
          allPending,
          allPendingError: allPendingError?.message,
          comparacao: `scheduled_for <= ${nowISOString}`,
          now_UTC: now.toISOString(),
          now_BR: nowBR.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        });
      }
      
      return new Response(
        JSON.stringify({
          message: 'Execução concluída sem mensagens a enviar.',
          insertedLogsCount: insertedLogs.length,
          pendingCountInDB: pendingCount || 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`✅ Encontradas ${finalPendingLogs.length} mensagens PENDING para processar`);
    
    // Usar finalPendingLogs daqui em diante (atualizar variável pendingLogs)
    const pendingLogsToProcess = finalPendingLogs;

    // Buscar dados adicionais de clientes, empresas e agendamentos para preencher templates
    const clientIds = Array.from(
      new Set(pendingLogsToProcess.map((l) => l.client_id).filter((id): id is string => !!id)),
    );
    const appointmentIds = Array.from(
      new Set(pendingLogsToProcess.map((l) => l.appointment_id).filter((id): id is string => !!id)),
    );

    const { data: clients, error: clientsError } = await supabaseAdmin
      .from<ClientRow>('clients')
      .select('id, name, phone')
      .in('id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000']); // hack para evitar erro se vazio

    if (clientsError) {
      console.error('Erro ao buscar clients:', clientsError);
    }

    // Buscar dados dos agendamentos para formatar DATA_HORA
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from<AppointmentRow>('appointments')
      .select('id, appointment_date, appointment_time')
      .in('id', appointmentIds.length ? appointmentIds : ['00000000-0000-0000-0000-000000000000']);

    if (appointmentsError) {
      console.error('Erro ao buscar appointments:', appointmentsError);
    }

    const companiesMap = new Map<string, CompanyRow>();
    companies.forEach((c) => companiesMap.set(c.id, c));

    const clientsMap = new Map<string, ClientRow>();
    (clients || []).forEach((c) => clientsMap.set(c.id, c));

    const appointmentsMap = new Map<string, AppointmentRow>();
    (appointments || []).forEach((a) => appointmentsMap.set(a.id, a));

    // Reaproveitar templates map

    const updates: any[] = [];

    for (const log of pendingLogsToProcess) {
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

      // Buscar dados da empresa e do agendamento para preencher placeholders
      const company = companiesMap.get(log.company_id);
      const appointment = log.appointment_id ? appointmentsMap.get(log.appointment_id) : null;

      // Formatar DATA_HORA do agendamento (se disponível)
      let dataHoraFormatada = '';
      if (appointment && appointment.appointment_date && appointment.appointment_time) {
        try {
          // Extrair apenas HH:mm do appointment_time
          const timeStr = appointment.appointment_time.length >= 5 
            ? appointment.appointment_time.substring(0, 5) 
            : appointment.appointment_time;
          
          // Formatar data: DD/MM/YYYY HH:mm
          const [year, month, day] = appointment.appointment_date.split('-');
          dataHoraFormatada = `${day}/${month}/${year} às ${timeStr}`;
        } catch (e) {
          console.warn('Erro ao formatar DATA_HORA:', e);
          dataHoraFormatada = `${appointment.appointment_date} ${appointment.appointment_time}`;
        }
      }

      // Preencher template com todas as informações
      const renderedText = applyTemplate(bodyTemplate, {
        CLIENTE: client?.name || '',
        EMPRESA: company?.name || '',
        DATA_HORA: dataHoraFormatada,
      });

      const sendResult = await sendViaProvider(provider, formattedPhone, renderedText);

      // Log detalhado do resultado
      console.log(`Resultado do envio para log ${log.id}:`, {
        ok: sendResult.ok,
        status: sendResult.status,
        response: sendResult.responseBody,
        phone: formattedPhone,
      });

      // Se falhou com ERR_NO_WHATSAPP_CONNECTION, logar detalhes adicionais
      if (!sendResult.ok && sendResult.responseBody?.error === 'ERR_NO_WHATSAPP_CONNECTION') {
        console.error(`❌ ERRO: Conexão WhatsApp não está ativa no LiotPRO para user_id: ${provider.user_id}, queue_id: ${provider.queue_id}`);
        console.error(`Verifique no painel do LiotPRO se a conexão WhatsApp está ativa e se user_id/queue_id estão corretos.`);
      }

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
    const executionDuration = Date.now() - startTime;
    
    console.log('=== RESUMO DA EXECUÇÃO ===');
    console.log(`Execution ID: ${executionId}`);
    console.log(`Logs inseridos na tabela: ${insertedLogs.length}`);
    console.log(`Logs processados: ${updates.length}`);
    console.log(`Logs enviados com sucesso: ${sentCount}`);
    console.log(`Logs com falha: ${failedCount}`);
    console.log(`Tempo de execução: ${executionDuration}ms`);
    console.log('=== FIM DA EXECUÇÃO ===');

    // Registrar log de execução na tabela worker_execution_logs
    try {
      const logStatus = failedCount > 0 && sentCount === 0 ? 'ERROR' : 
                       failedCount > 0 ? 'PARTIAL' : 'SUCCESS';
      
      await supabaseAdmin
        .from('worker_execution_logs')
        .insert({
          execution_time: new Date().toISOString(),
          status: logStatus,
          messages_processed: updates.length,
          messages_sent: sentCount,
          messages_failed: failedCount,
          execution_duration_ms: executionDuration,
          details: {
            execution_id: executionId,
            inserted_logs: insertedLogs.length,
            pending_count: pendingCount || 0,
            timestamp: new Date().toISOString(),
          },
          error_message: failedCount > 0 ? `${failedCount} mensagens falharam` : null,
        });
      
      console.log(`✅ Log de execução registrado na tabela worker_execution_logs`);
    } catch (logError) {
      console.error('⚠️ Erro ao registrar log de execução:', logError);
      // Não falhar a execução por causa do log
    }

    return new Response(
      JSON.stringify({
        message: 'Worker executado com sucesso.',
        execution_id: executionId,
        execution_time: new Date().toISOString(),
        execution_duration_ms: executionDuration,
        insertedLogsCount: insertedLogs.length,
        processedLogsCount: updates.length,
        sentCount,
        failedCount,
        status: failedCount > 0 && sentCount === 0 ? 'ERROR' : 
               failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    const executionDuration = Date.now() - startTime;
    console.error('❌ ERRO CRÍTICO na Edge Function:', error);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    // Registrar erro no log de execução
    try {
      const supabaseAdminError = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } },
      );
      
      await supabaseAdminError
        .from('worker_execution_logs')
        .insert({
          execution_time: new Date().toISOString(),
          status: 'ERROR',
          messages_processed: 0,
          messages_sent: 0,
          messages_failed: 0,
          execution_duration_ms: executionDuration,
          error_message: error.message || 'Erro desconhecido',
          details: {
            execution_id: executionId,
            error_stack: error.stack,
            timestamp: new Date().toISOString(),
          },
        });
    } catch (logError) {
      console.error('⚠️ Erro ao registrar log de erro:', logError);
    }
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno: ' + error.message,
      execution_id: executionId,
      execution_duration_ms: executionDuration,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

