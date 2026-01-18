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

    // Verify the user's session (the one calling this function)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Edge Function Error (invite-collaborator): Unauthorized - No Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Edge Function Error (invite-collaborator): Auth error -', userError?.message || 'User not found');
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { companyId, firstName, lastName, email, phoneNumber, hireDate, roleTypeId, commissionPercentage, status, avatarUrl } = await req.json();

    console.log('Edge Function Debug (invite-collaborator): Received data:', { companyId, firstName, lastName, email, phoneNumber, hireDate, roleTypeId, commissionPercentage, status, avatarUrl });
    console.log('Edge Function Debug (invite-collaborator): Authenticated user ID:', user.id);

    if (!companyId || !firstName || !lastName || !email || !phoneNumber || !hireDate || !roleTypeId || commissionPercentage === undefined || !status) {
      console.error('Edge Function Error (invite-collaborator): Missing required collaborator data');
      return new Response(JSON.stringify({ error: 'Missing required collaborator data' }), {
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
      console.error('Edge Function Error (invite-collaborator): Role check error -', roleError?.message || 'User not authorized for this company');
      return new Response(JSON.stringify({ error: 'Forbidden: User not authorized for this company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleTypeData, error: roleTypeFetchError } = await supabaseAdmin
      .from('role_types')
      .select('description')
      .eq('id', userCompanyRoles.role_type)
      .single();

    if (roleTypeFetchError || !roleTypeData || !['Proprietário', 'Admin'].includes(roleTypeData.description)) {
      console.error('Edge Function Error (invite-collaborator): Role type description error -', roleTypeFetchError?.message || 'User does not have sufficient privileges');
      return new Response(JSON.stringify({ error: 'Forbidden: User does not have sufficient privileges for this company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let invitedAuthUser = null;
    let inviteOperationError = null;
    let inviteOperationMessage = '';

    // Check if a user with this email already exists in auth.users
    const { data: { users: existingAuthUsers }, error: fetchExistingUserError } = await supabaseAdmin.auth.admin.listUsers({
      email: email,
    });

    if (fetchExistingUserError) {
      console.error('Edge Function Error (invite-collaborator): Error checking for existing user -', fetchExistingUserError.message);
      return new Response(JSON.stringify({ error: 'Error checking for existing user: ' + fetchExistingUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existingAuthUser = existingAuthUsers.length > 0 ? existingAuthUsers[0] : null;

    if (existingAuthUser) {
      // User already exists, send a magic link or password reset link
      console.log('Edge Function Debug (invite-collaborator): User already exists, sending magic link.');
      const { error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink', // Sends a link to sign in or set password
        email: email,
        options: {
          redirectTo: `${Deno.env.get('SITE_URL') || 'https://tegyiuktrmcqxkbjxqoc.supabase.co'}/signup`, // Redirect to signup to set password
        },
      });

      if (magicLinkError) {
        inviteOperationError = magicLinkError;
        inviteOperationMessage = 'Erro ao enviar link mágico para colaborador existente: ' + magicLinkError.message;
      } else {
        invitedAuthUser = existingAuthUser;
        inviteOperationMessage = 'Link de acesso enviado com sucesso para o e-mail do colaborador existente.';
      }
    } else {
      // User does not exist, proceed with inviteUserByEmail
      console.log('Edge Function Debug (invite-collaborator): User does not exist, inviting new user.');
      const { data: newInvitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          hire_date: hireDate,
          role_type_id: roleTypeId,
          commission_percentage: commissionPercentage,
          status: status,
          avatar_url: avatarUrl,
        },
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://tegyiuktrmcqxkbjxqoc.supabase.co'}/signup`,
      });

      if (inviteError) {
        inviteOperationError = inviteError;
        inviteOperationMessage = 'Erro ao convidar novo colaborador: ' + inviteError.message;
      } else {
        invitedAuthUser = newInvitedUser.user;
        inviteOperationMessage = 'Convite enviado com sucesso para o novo colaborador.';
      }
    }

    if (inviteOperationError || !invitedAuthUser) {
      console.error('Edge Function Error (invite-collaborator): Invite/Magic link operation failed -', inviteOperationError?.message || 'No invited user data.');
      return new Response(JSON.stringify({ error: inviteOperationMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Edge Function Debug (invite-collaborator): User invited/magic link sent successfully:', invitedAuthUser.id);

    // Insert collaborator data into the public.collaborators table
    const { data: collaboratorData, error: insertCollaboratorError } = await supabaseAdmin
      .from('collaborators')
      .insert({
        user_id: invitedAuthUser.id, // Link to the newly invited/existing user's auth ID
        company_id: companyId,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phoneNumber,
        hire_date: hireDate,
        role_type_id: roleTypeId,
        commission_percentage: commissionPercentage,
        status: status,
        avatar_url: avatarUrl,
      })
      .select()
      .single();

    if (insertCollaboratorError) {
      console.error('Edge Function Error (invite-collaborator): Insert collaborator error -', insertCollaboratorError.message);
      return new Response(JSON.stringify({ error: insertCollaboratorError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Edge Function Debug (invite-collaborator): Collaborator data inserted successfully:', collaboratorData?.id);

    // Assign the collaborator to the company in user_companies table
    const { error: assignRoleError } = await supabaseAdmin.rpc('assign_user_to_company', {
      p_user_id: invitedAuthUser.id,
      p_company_id: companyId,
      p_role_type_id: roleTypeId
    });

    if (assignRoleError) {
      console.error('Edge Function Error (invite-collaborator): Assign role error -', assignRoleError.message);
      return new Response(JSON.stringify({ error: assignRoleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Edge Function Debug (invite-collaborator): Collaborator assigned to company successfully.');

    return new Response(JSON.stringify({ message: inviteOperationMessage, collaborator: collaboratorData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (invite-collaborator): Uncaught exception -', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});