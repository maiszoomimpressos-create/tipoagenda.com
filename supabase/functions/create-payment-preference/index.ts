import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';
import mercadopago from 'https://esm.sh/mercadopago@1.5.17'; // Downgrade para 1.5.17

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
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { planId, companyId, planName, planPrice, durationMonths } = await req.json();

    if (!planId || !companyId || !planName || planPrice === undefined || durationMonths === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required plan or company data' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('PAYMENT_API_KEY_SECRET');
    const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:8080'; // Fallback URL

    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not set.');
      return new Response(JSON.stringify({ error: 'Payment service not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log('Mercado Pago Access Token found. Configuring MP SDK (v1.x)...');

    // Usando a API da versão 1.x
    mercadopago.configure({
      access_token: MERCADOPAGO_ACCESS_TOKEN,
    });

    const preferenceBody = {
      items: [
        {
          title: `Assinatura: ${planName} (${durationMonths} meses)`,
          unit_price: planPrice,
          quantity: 1,
          currency_id: 'BRL',
        },
      ],
      external_reference: `${companyId}_${planId}`,
      back_urls: {
        success: `${SITE_URL}/planos?status=success`,
        failure: `${SITE_URL}/planos?status=failure`,
        pending: `${SITE_URL}/planos?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
    };

    const mpResponse = await mercadopago.preferences.create(preferenceBody);
    
    console.log('Mercado Pago Preference created successfully.');

    return new Response(JSON.stringify({ 
      preferenceId: mpResponse.body.id, // Acessando .body.id para v1.x
      initPoint: mpResponse.body.init_point, // Acessando .body.init_point para v1.x
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (create-payment-preference): Uncaught exception during MP call:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to create payment preference: ' + error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});