import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { name } = await req.json(); // Apenas o nome do convidado é necessário agora

    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing required parameter: name' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const CLIENT_ID_PADRAO = '229a877f-238d-4dee-8eca-f0efe4a24e59'; // ID do cliente padrão fornecido pelo usuário

    return new Response(JSON.stringify({ clientId: CLIENT_ID_PADRAO, clientNickname: name }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error: any) {
    console.error('Edge Function Error (find-or-create-client-for-guest): Uncaught exception -', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

