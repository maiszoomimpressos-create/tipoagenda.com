import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    // Verify the user's session (the one calling this function)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Edge Function Error (resend-client-invite): Unauthorized - No Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Edge Function Error (resend-client-invite): Auth error -', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientEmail, companyId } = await req.json();

    console.log('Edge Function Debug (resend-client-invite): Received clientEmail:', clientEmail);
    console.log('Edge Function Debug (resend-client-invite): Received companyId:', companyId);
    console.log('Edge Function Debug (resend-client-invite): Authenticated user ID:', user.id);


    if (!clientEmail || !companyId) {
      console.error('Edge Function Error (resend-client-invite): Missing required data for resend');
      return new Response(JSON.stringify({ error: 'Missing required client email or company ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Check if the calling user (user.id) is an admin/proprietor of the companyId
    const { data: userCompanyRoles, error: roleError } = await supabaseAdmin
      .from('user_companies')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single();

    if (roleError || !userCompanyRoles) {
      console.error('Edge Function Error (resend-client-invite): Role check error -', roleError?.message || 'User not authorized for this company');
      console.error('Edge Function Debug (resend-client-invite): User ID:', user.id, 'Company ID:', companyId);
      console.error('Edge Function Debug (resend-client-invite): Role fetch error:', roleError);
      return new Response(JSON.stringify({ error: 'Forbidden: User not authorized for this company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch role_type description to verify if it's 'Proprietário' or 'Admin'
    const { data: roleTypeData, error: roleTypeFetchError } = await supabaseAdmin
      .from('role_types')
      .select('description')
      .eq('id', userCompanyRoles.role_type)
      .single();

    console.log('Edge Function Debug (resend-client-invite): User role type ID:', userCompanyRoles.role_type);
    console.log('Edge Function Debug (resend-client-invite): User role type description:', roleTypeData?.description);


    if (roleTypeFetchError || !roleTypeData || !['Proprietário', 'Admin'].includes(roleTypeData.description)) {
      console.error('Edge Function Error (resend-client-invite): Role type description error -', roleTypeFetchError?.message || 'User does not have sufficient privileges');
      console.error('Edge Function Debug (resend-client-invite): Role type fetch error:', roleTypeFetchError);
      return new Response(JSON.stringify({ error: 'Forbidden: User does not have sufficient privileges for this company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resend the invitation email
    const { data: resendData, error: resendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(clientEmail, {
      // Redirect to the signup page so the client can set their password
      redirectTo: `${Deno.env.get('SITE_URL') || 'https://tegyiuktrmcqxkbjxqoc.supabase.co'}/signup`,
    });

    if (resendError) {
      console.error('Edge Function Error (resend-client-invite): Resend invite error -', resendError.message);
      return new Response(JSON.stringify({ error: resendError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Edge Function Debug (resend-client-invite): Invitation email resent successfully for:', clientEmail);

    return new Response(JSON.stringify({ message: 'Invitation email resent successfully', user: resendData.user }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (resend-client-invite): Uncaught exception -', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});