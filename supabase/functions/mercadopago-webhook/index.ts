import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import { format, addMonths, parseISO, startOfDay } from 'https://esm.sh/date-fns@3.6.0';

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

  let paymentAttemptId: string | null = null; // Declare here to be accessible in catch block

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

    // 2. Extract Metadata (companyId, planId, finalDurationMonths, couponId, paymentAttemptId)
    const externalReference = payment.external_reference;
    if (!externalReference) {
        console.error('Missing external_reference in payment data.');
        return new Response(JSON.stringify({ error: 'Missing external reference' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const parts = externalReference.split('_');
    // Updated check for parts length to include paymentAttemptId
    if (parts.length < 5) { 
        console.error('Invalid external_reference format:', externalReference);
        return new Response(JSON.stringify({ error: 'Invalid external reference format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const [companyId, planId, finalDurationMonthsStr, couponId, extractedPaymentAttemptId] = parts;
    const finalDurationMonths = parseInt(finalDurationMonthsStr);
    const hasCoupon = couponId !== 'none';
    paymentAttemptId = extractedPaymentAttemptId; // Assign to outer scope variable

    // --- NEW: Update payment attempt status based on Mercado Pago status ---
    let newPaymentAttemptStatus: string;
    switch (payment.status) {
        case 'approved':
            newPaymentAttemptStatus = 'approved';
            break;
        case 'pending':
            newPaymentAttemptStatus = 'pending';
            break;
        case 'rejected':
            newPaymentAttemptStatus = 'rejected';
            break;
        default:
            newPaymentAttemptStatus = 'failed'; // Catch all other statuses as failed
    }

    const { error: paUpdateError } = await supabaseAdmin
        .from('payment_attempts')
        .update({ status: newPaymentAttemptStatus, payment_gateway_reference: payment.id }) // Update with actual payment ID
        .eq('id', paymentAttemptId);

    if (paUpdateError) {
        console.error(`Error updating payment attempt ${paymentAttemptId} status to ${newPaymentAttemptStatus}:`, paUpdateError);
        // Continue, as subscription is the main goal, but log the error
    } else {
        console.log(`Payment attempt ${paymentAttemptId} status updated to ${newPaymentAttemptStatus}.`);
    }

    if (payment.status !== 'approved') {
      return new Response(JSON.stringify({ received: true, message: `Payment status is ${payment.status}, not approved.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Handle Subscription Activation/Extension (only if approved)
    const today = new Date();
    const startDate = format(today, 'yyyy-MM-dd');
    
    // Check for existing active subscription for this company
    const { data: existingSub, error: checkSubError } = await supabaseAdmin
        .from('company_subscriptions')
        .select('id, end_date')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

    let finalEndDate: string;
    let subscriptionId: string;

    if (checkSubError && checkSubError.code !== 'PGRST116') throw checkSubError;

    if (existingSub) {
        // Extend the end date from the current end date
        const currentEndDate = startOfDay(parseISO(existingSub.end_date || startDate));
        const baseDate = isPast(currentEndDate) ? today : currentEndDate;
        const newEndDate = addMonths(baseDate, finalDurationMonths);
        finalEndDate = format(newEndDate, 'yyyy-MM-dd');
        subscriptionId = existingSub.id;

        const { error: updateError } = await supabaseAdmin
            .from('company_subscriptions')
            .update({ 
                plan_id: planId,
                end_date: finalEndDate,
                status: 'active',
            })
            .eq('id', subscriptionId);

        if (updateError) throw updateError;
        console.log(`Subscription ${subscriptionId} extended successfully to ${finalEndDate}.`);

    } else {
        // No active subscription, create a new one
        const calculatedEndDate = addMonths(today, finalDurationMonths);
        finalEndDate = format(calculatedEndDate, 'yyyy-MM-dd');

        const { data: newSub, error: insertError } = await supabaseAdmin
            .from('company_subscriptions')
            .insert({
                company_id: companyId,
                plan_id: planId,
                start_date: startDate,
                end_date: finalEndDate,
                status: 'active',
            })
            .select('id')
            .single();

        if (insertError) throw insertError;
        subscriptionId = newSub.id;
        console.log(`New subscription ${subscriptionId} created successfully, ending on ${finalEndDate}.`);
    }
    
    // 4. Register Coupon Usage (if applicable)
    if (hasCoupon) {
        const { error: usageInsertError } = await supabaseAdmin
            .from('coupon_usages')
            .insert({ company_id: companyId, admin_coupon_id: couponId });
        
        if (usageInsertError) {
            console.error('Failed to register coupon usage:', usageInsertError);
            // Log the error but continue, as the subscription is the priority
        } else {
            console.log(`Coupon ${couponId} usage registered successfully.`);
            
            // 5. Increment coupon usage count (using RPC for security/simplicity)
            await supabaseAdmin.rpc('increment_coupon_usage', { coupon_id: couponId });
        }
    }

    // 6. Acknowledge success to Mercado Pago
    return new Response(JSON.stringify({ success: true, subscriptionId, status: payment.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (mercadopago-webhook):', error.message);
    // --- NEW: If an error occurs after paymentAttemptId is known, mark it as failed ---
    if (paymentAttemptId) {
        await supabaseAdmin.from('payment_attempts').update({ status: 'failed' }).eq('id', paymentAttemptId);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});