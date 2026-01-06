import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import { format, addMonths, parseISO, isPast, startOfDay } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to handle subscription creation/extension
async function handleSubscription(supabaseAdmin: any, companyId: string, planId: string, durationMonths: number, price: number, isFreeTrial: boolean = false) {
    const today = new Date();
    const startDate = format(today, 'yyyy-MM-dd');
    
    // 1. Check for existing active subscription for this company
    const { data: existingSub, error: checkSubError } = await supabaseAdmin
        .from('company_subscriptions')
        .select('id, end_date')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

    if (checkSubError && checkSubError.code !== 'PGRST116') throw checkSubError;

    let finalEndDate: string;
    let subscriptionId: string;

    if (existingSub) {
        // Extend the end date from the current end date
        const currentEndDate = startOfDay(parseISO(existingSub.end_date || startDate));
        const baseDate = isPast(currentEndDate) ? today : currentEndDate;
        const newEndDate = addMonths(baseDate, durationMonths);
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
        const calculatedEndDate = addMonths(today, durationMonths);
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
    
    return { subscriptionId, finalEndDate };
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('PAYMENT_API_KEY_SECRET');
  const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:8080';

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { auth: { persistSession: false } });
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { planId, companyId, planName, planPrice, durationMonths, coupon } = await req.json();

    if (!planId || !companyId || !planName || planPrice === undefined || durationMonths === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required plan or company data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let finalPrice = planPrice;
    let finalDurationMonths = durationMonths;
    let couponId = null;

    // --- 1. Apply Coupon Logic (if provided) ---
    if (coupon) {
        couponId = coupon.id;
        
        // Re-validate coupon usage (security check against race conditions)
        const { data: usageData, error: usageError } = await supabaseAdmin
            .from('coupon_usages')
            .select('id')
            .eq('company_id', companyId)
            .eq('admin_coupon_id', couponId)
            .limit(1);

        if (usageError) throw usageError;
        if (usageData && usageData.length > 0) {
            throw new Error('Coupon already used by this company.');
        }

        // Apply financial discount
        if (coupon.discount_type === 'percentual') {
            finalPrice = planPrice * (1 - coupon.discount_value / 100);
        } else if (coupon.discount_type === 'fixed') {
            finalPrice = Math.max(0, planPrice - coupon.discount_value);
        }
        
        // Apply time discount (30 days / 1 month free trial)
        finalDurationMonths += 1; // Add 1 month free trial

        console.log(`Coupon applied. Original Price: ${planPrice}, Final Price: ${finalPrice}, Final Duration: ${finalDurationMonths} months.`);
    }

    // --- 2. Handle Subscription Activation ---
    
    if (finalPrice <= 0) {
        // If price is zero (e.g., 100% discount or free plan), activate immediately
        const { subscriptionId } = await handleSubscription(supabaseAdmin, companyId, planId, finalDurationMonths, finalPrice, true);
        
        // Register coupon usage if applicable
        if (couponId) {
            const { error: usageInsertError } = await supabaseAdmin
                .from('coupon_usages')
                .insert({ company_id: companyId, admin_coupon_id: couponId });
            if (usageInsertError) console.error('Failed to register coupon usage:', usageInsertError);
            
            // Increment coupon usage count
            await supabaseAdmin.rpc('increment_coupon_usage', { coupon_id: couponId });
        }

        return new Response(JSON.stringify({ message: 'Subscription activated immediately (Free Trial/Discount)', subscriptionId }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } else {
        // If price > 0, proceed to payment gateway (Mercado Pago)
        if (!MERCADOPAGO_ACCESS_TOKEN) {
            console.error('MERCADOPAGO_ACCESS_TOKEN not set.');
            return new Response(JSON.stringify({ error: 'Payment service not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // --- NEW: Register payment attempt as 'initiated' ---
        const { data: paymentAttempt, error: paInsertError } = await supabaseAdmin
            .from('payment_attempts')
            .insert({
                company_id: companyId,
                plan_id: planId,
                user_id: user.id,
                status: 'initiated',
                amount: finalPrice,
                currency: 'BRL',
            })
            .select('id')
            .single();

        if (paInsertError) {
            console.error('Error inserting payment attempt:', paInsertError);
            throw new Error('Failed to register payment attempt: ' + paInsertError.message);
        }
        const paymentAttemptId = paymentAttempt.id;
        console.log(`Payment attempt ${paymentAttemptId} initiated.`);


        const preferenceBody = {
            items: [
                {
                    title: `Assinatura: ${planName} (${durationMonths} meses) - Desconto Aplicado`,
                    unit_price: finalPrice,
                    quantity: 1,
                    currency_id: 'BRL',
                },
            ],
            // Pass coupon ID, final duration, AND payment_attempt_id in external reference for webhook processing
            external_reference: `${companyId}_${planId}_${finalDurationMonths}_${couponId || 'none'}_${paymentAttemptId}`,
            back_urls: {
                success: `${SITE_URL}/planos?status=success`,
                failure: `${SITE_URL}/planos?status=failure`,
                pending: `${SITE_URL}/planos?status=pending`,
            },
            auto_return: 'approved',
            notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
        };

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(preferenceBody),
        });

        if (!mpResponse.ok) {
            const errorData = await mpResponse.json();
            console.error('Mercado Pago API Error:', mpResponse.status, errorData);
            // --- NEW: Update payment attempt status to 'failed' if Mercado Pago call fails ---
            await supabaseAdmin.from('payment_attempts').update({ status: 'failed' }).eq('id', paymentAttemptId);
            throw new Error(`Mercado Pago API error: ${errorData.message || mpResponse.statusText}`);
        }

        const mpData = await mpResponse.json();
        
        // --- NEW: Update payment attempt with Mercado Pago preference ID ---
        await supabaseAdmin.from('payment_attempts').update({ payment_gateway_reference: mpData.id }).eq('id', paymentAttemptId);

        return new Response(JSON.stringify({ 
            preferenceId: mpData.id,
            initPoint: mpData.init_point,
            paymentAttemptId: paymentAttemptId, // Return payment attempt ID to frontend for potential tracking
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: any) {
    console.error('Edge Function Error (apply-coupon-and-subscribe): Uncaught exception:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to process subscription: ' + error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});