import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify the user's session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { appointmentId, collaboratorId } = await req.json();

    if (!appointmentId || !collaboratorId) {
      return new Response(JSON.stringify({ error: 'Missing required data: appointmentId and collaboratorId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verificar se o colaborador existe e está vinculado ao usuário logado
    const { data: collaboratorData, error: collaboratorError } = await supabaseAdmin
      .from('collaborators')
      .select('id, user_id, company_id')
      .eq('id', collaboratorId)
      .eq('user_id', user.id)
      .single();

    if (collaboratorError || !collaboratorData) {
      return new Response(JSON.stringify({ error: 'Forbidden: Collaborator not found or not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar o agendamento e verificar se pertence ao colaborador
    const { data: appointmentData, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, collaborator_id, company_id, status, total_price, appointment_services(service_id, commission_type, commission_value)')
      .eq('id', appointmentId)
      .eq('collaborator_id', collaboratorId)
      .eq('company_id', collaboratorData.company_id)
      .single();

    if (appointmentError || !appointmentData) {
      return new Response(JSON.stringify({ error: 'Appointment not found or not authorized for this collaborator' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o agendamento já foi finalizado
    if (appointmentData.status === 'concluido') {
      return new Response(JSON.stringify({ error: 'Este agendamento já foi finalizado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o status permite finalização
    if (appointmentData.status !== 'pendente' && appointmentData.status !== 'confirmado') {
      return new Response(JSON.stringify({ error: `Não é possível finalizar um agendamento com status: ${appointmentData.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Atualizar status do agendamento para 'concluido'
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'concluido' })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment status:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update appointment status: ' + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar comissões configuradas para os serviços do agendamento
    const appointmentServices = appointmentData.appointment_services || [];
    let totalCommission = 0;
    const commissionDetails: Array<{ serviceId: string; commission: number; type: string }> = [];

    for (const appointmentService of appointmentServices) {
      const serviceId = appointmentService.service_id;
      
      // Buscar comissão configurada em collaborator_services
      const { data: collaboratorService, error: csError } = await supabaseAdmin
        .from('collaborator_services')
        .select('commission_type, commission_value')
        .eq('collaborator_id', collaboratorId)
        .eq('service_id', serviceId)
        .eq('active', true)
        .maybeSingle();

      if (csError && csError.code !== 'PGRST116') {
        console.warn(`Error fetching commission for service ${serviceId}:`, csError);
        continue;
      }

      if (collaboratorService) {
        // Buscar preço do serviço no agendamento
        const { data: serviceData, error: serviceError } = await supabaseAdmin
          .from('services')
          .select('price')
          .eq('id', serviceId)
          .single();

        if (serviceError || !serviceData) {
          console.warn(`Service ${serviceId} not found, skipping commission calculation`);
          continue;
        }

        const servicePrice = parseFloat(serviceData.price) || 0;
        let commission = 0;

        if (collaboratorService.commission_type === 'PERCENT') {
          commission = servicePrice * (parseFloat(collaboratorService.commission_value) / 100);
        } else if (collaboratorService.commission_type === 'FIXED') {
          commission = parseFloat(collaboratorService.commission_value);
        }

        if (commission > 0) {
          totalCommission += commission;
          commissionDetails.push({
            serviceId,
            commission,
            type: collaboratorService.commission_type,
          });
        }
      }
    }

    // 3. Criar registro de recebimento no cash_movements (se ainda não existir)
    // Verificar se já existe um registro de recebimento para este agendamento
    const { data: existingReceipt, error: receiptCheckError } = await supabaseAdmin
      .from('cash_movements')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('transaction_type', 'recebimento')
      .maybeSingle();

    if (receiptCheckError && receiptCheckError.code !== 'PGRST116') {
      console.warn('Error checking existing receipt:', receiptCheckError);
    }

    // Se não existe recebimento, criar um (valor total do agendamento)
    if (!existingReceipt) {
      const { error: receiptError } = await supabaseAdmin
        .from('cash_movements')
        .insert({
          company_id: collaboratorData.company_id,
          appointment_id: appointmentId,
          user_id: user.id,
          total_amount: appointmentData.total_price,
          payment_method: 'dinheiro', // Default, pode ser ajustado depois
          transaction_type: 'recebimento',
          observations: `Recebimento do agendamento ${appointmentId} finalizado pelo colaborador`,
        });

      if (receiptError) {
        console.warn('Error creating receipt transaction:', receiptError);
        // Não falha o processo, apenas loga o aviso
      }
    }

    // 4. Criar registro de comissão no cash_movements (se houver comissão)
    if (totalCommission > 0) {
      const { error: commissionError } = await supabaseAdmin
        .from('cash_movements')
        .insert({
          company_id: collaboratorData.company_id,
          appointment_id: appointmentId,
          user_id: user.id,
          total_amount: totalCommission,
          payment_method: 'dinheiro', // Comissão é sempre em dinheiro
          transaction_type: 'despesa', // Comissão é uma despesa para a empresa
          observations: `Comissão do colaborador pelo agendamento ${appointmentId}. Detalhes: ${commissionDetails.map(c => `Serviço ${c.serviceId}: R$ ${c.commission.toFixed(2)} (${c.type})`).join(', ')}`,
        });

      if (commissionError) {
        console.error('Error creating commission transaction:', commissionError);
        // Não falha o processo, mas loga o erro
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Agendamento finalizado com sucesso',
      commission: totalCommission,
      commissionDetails,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (finalize-appointment-by-collaborator): Uncaught exception:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

