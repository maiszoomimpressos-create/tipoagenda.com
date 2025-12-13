import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
// Removendo a importação do SDK do Mercado Pago
import { format, addMonths, parseISO } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('PAYMENT_API_KEY_SECRET');

  if (!MERCADOPAGO_ACCESS_TOKEN) {
    console.error('MERCADOPAGO_ACCESS_TOKEN not set.');
    return new Response(JSON.stringify({ error: 'Payment service not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json();
    const { type, data } = body;

    console.log('Webhook Received:', { type, data });

    if (type !== 'payment' || !data || !data.id) {
      return new Response(JSON.stringify({ received: true, message: 'Non-payment notification type received or missing data ID.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const paymentId = data.id;

    // 1. Fetch Payment Details from Mercado Pago directly via API
    const mpPaymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!mpPaymentResponse.ok) {
      const errorData = await mpPaymentResponse.json();
      console.error('Mercado Pago Payment API Error:', mpPaymentResponse.status, errorData);
      throw new Error(`Mercado Pago Payment API error: ${errorData.message || mpPaymentResponse.statusText}`);
    }

    const payment = await mpPaymentResponse.json();

    console.log('Payment Status:', payment.status);
    console.log('External Reference:', payment.external_reference);

    if (payment.status !== 'approved') {
      return new Response(JSON.stringify({ received: true, message: `Payment status is ${payment.status}, not approved.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Extract Metadata (companyId and planId)
    const externalReference = payment.external_reference;
    if (!externalReference) {
        console.error('Missing external_reference in payment data.');
        return new Response(JSON.stringify({ error: 'Missing external reference' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const [companyId, planId] = externalReference.split('_');

    if (!companyId || !planId) {
        console.error('Invalid external_reference format:', externalReference);
        return new Response(JSON.stringify({ error: 'Invalid external reference format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Fetch Plan Details to get duration
    const { data: planData, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('duration_months')
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      console.error('Plan not found or error fetching plan:', planError?.message);
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const durationMonths = planData.duration_months;
    const today = new Date();
    const startDate = format(today, 'yyyy-MM-dd');
    
    let endDate: string | null = null;
    if (durationMonths > 0) {
        const calculatedEndDate = addMonths(today, durationMonths);
        endDate = format(calculatedEndDate, 'yyyy-MM-dd');
    }

    // 4. Check for existing active subscription for this company
    const { data: existingSub, error: checkSubError } = await supabaseAdmin
        .from('company_subscriptions')
        .select('id, end_date')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

    // 5. Insert or Update Subscription
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    let subscriptionId = null;

    if (existingSub) {
        // If an active subscription exists, extend the end date from the current end date
        const currentEndDate = parseISO(existingSub.end_date || startDate);
        const newEndDate = addMonths(currentEndDate, durationMonths);
        finalEndDate = format(newEndDate, 'yyyy-MM-dd');
        subscriptionId = existingSub.id;

        const { error: updateError } = await supabaseAdmin
            .from('company_subscriptions')
            .update({ 
                plan_id: planId, // Update to the new plan ID
                end_date: finalEndDate,
                status: 'active',
                // Note: start_date is not updated here, as we are extending the existing subscription
            })
            .eq('id', subscriptionId);

        if (updateError) throw updateError;
        console.log(`Subscription ${subscriptionId} extended successfully to ${finalEndDate}.`);

    } else {
        // No active subscription, create a new one
        const { data: newSub, error: insertError } = await supabaseAdmin
            .from('company_subscriptions')
            .insert({
                company_id: companyId,
                plan_id: planId,
                start_date: finalStartDate,
                end_date: finalEndDate,
                status: 'active',
            })
            .select('id')
            .single();

        if (insertError) throw insertError;
        subscriptionId = newSub.id;
        console.log(`New subscription ${subscriptionId} created successfully, ending on ${finalEndDate}.`);
    }

    // 6. Acknowledge success to Mercado Pago
    return new Response(JSON.stringify({ success: true, subscriptionId, status: payment.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (mercadopago-webhook):', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});