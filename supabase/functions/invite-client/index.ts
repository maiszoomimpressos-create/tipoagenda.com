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
      console.error('Edge Function Error (invite-client): Unauthorized - No Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Edge Function Error (invite-client): Auth error -', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientEmail, clientName, companyId, clientPhone, clientBirthDate, clientZipCode, clientState, clientCity, clientAddress, clientNumber, clientNeighborhood, clientComplement, clientObservations, clientStatus, clientPoints } = await req.json();

    console.log('Edge Function Debug (invite-client): Received clientEmail:', clientEmail);
    console.log('Edge Function Debug (invite-client): Received companyId:', companyId);
    console.log('Edge Function Debug (invite-client): Authenticated user ID:', user.id);


    if (!clientEmail || !clientName || !companyId || !clientPhone || !clientBirthDate || !clientZipCode || !clientState || !clientCity || !clientAddress || !clientNumber || !clientNeighborhood) {
      console.error('Edge Function Error (invite-client): Missing required client data');
      return new Response(JSON.stringify({ error: 'Missing required client data' }), {
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
      console.error('Edge Function Error (invite-client): Role check error -', roleError?.message || 'User not authorized for this company');
      console.error('Edge Function Debug (invite-client): User ID:', user.id, 'Company ID:', companyId);
      console.error('Edge Function Debug (invite-client): Role fetch error:', roleError);
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

    console.log('Edge Function Debug (invite-client): User role type ID:', userCompanyRoles.role_type);
    console.log('Edge Function Debug (invite-client): User role type description:', roleTypeData?.description);


    if (roleTypeFetchError || !roleTypeData || !['Proprietário', 'Admin'].includes(roleTypeData.description)) {
      console.error('Edge Function Error (invite-client): Role type description error -', roleTypeFetchError?.message || 'User does not have sufficient privileges');
      console.error('Edge Function Debug (invite-client): Role type fetch error:', roleTypeFetchError);
      return new Response(JSON.stringify({ error: 'Forbidden: User does not have sufficient privileges for this company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invite the client as a new user
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(clientEmail, {
      data: {
        full_name: clientName, // Store full name in user_metadata
        phone: clientPhone,
        birth_date: clientBirthDate,
      },
      // Redirect to the signup page so the client can set their password
      redirectTo: `${Deno.env.get('SITE_URL') || 'https://tegyiuktrmcqxkbjxqoc.supabase.co'}/signup`,
    });

    if (inviteError) {
      console.error('Edge Function Error (invite-client): Invite user error -', inviteError.message);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Edge Function Debug (invite-client): User invited successfully:', invitedUser.user?.id);

    // Insert client data into the public.clients table
    const { data: clientData, error: insertClientError } = await supabaseAdmin
      .from('clients')
      .insert({
        user_id: user.id, // The user who created this client
        company_id: companyId,
        client_auth_id: invitedUser.user?.id, // Link to the newly invited user's auth ID
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        birth_date: clientBirthDate,
        zip_code: clientZipCode,
        state: clientState,
        city: clientCity,
        address: clientAddress,
        number: clientNumber,
        neighborhood: clientNeighborhood,
        complement: clientComplement,
        observations: clientObservations,
        status: clientStatus,
        points: clientPoints,
      })
      .select()
      .single();

    if (insertClientError) {
      console.error('Edge Function Error (invite-client): Insert client error -', insertClientError.message);
      // If client insertion fails, consider rolling back the user invite (more complex)
      return new Response(JSON.stringify({ error: insertClientError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Edge Function Debug (invite-client): Client data inserted successfully:', clientData?.id);

    return new Response(JSON.stringify({ message: 'Client invited and registered successfully', client: clientData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (invite-client): Uncaught exception -', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});