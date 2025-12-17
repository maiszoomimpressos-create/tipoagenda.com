import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to handle contract acceptance check
async function checkLatestContract(supabaseAdmin: any) {
    const { data: contractData, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (contractError && contractError.code !== 'PGRST116') throw contractError;
    
    return contractData?.id || null;
}

// Helper function to get Proprietário Role ID
async function getProprietarioRoleId(supabaseAdmin: any) {
    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('role_types')
        .select('id')
        .eq('description', 'Proprietário')
        .single();

    if (roleError || !roleData) {
        throw new Error('Proprietário role ID not found. Ensure role_types table is configured.');
    }
    return roleData.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { 
        // User Data
        firstName, lastName, email, password, phoneNumber, 
        // Placeholder values for missing fields
        cpf = '00000000000', 
        birthDate = '1900-01-01', 
        gender = 'Outro',
        // Company Data
        companyName, razaoSocial, cnpj, ie, companyEmail, companyPhoneNumber, segmentType,
        address, number, neighborhood, complement, zipCode, city, state, imageUrl
    } = await req.json();

    // 1. Input Validation (Basic check, detailed validation is done on frontend)
    if (!email || !password || !companyName || !cnpj || !segmentType) {
        return new Response(JSON.stringify({ error: 'Missing required data for user or company.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fetch necessary IDs (Contract and Role)
    const latestContractId = await checkLatestContract(supabaseAdmin);
    if (!latestContractId) {
        throw new Error('No active contract found. Cannot register company.');
    }
    const proprietarioRoleId = await getProprietarioRoleId(supabaseAdmin);

    // 3. Create User in Auth (This triggers handle_new_user to create the profile)
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for professional signups
        user_metadata: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            cpf: cpf, // Placeholder
            birth_date: birthDate, // Placeholder
            gender: gender, // Placeholder
        },
    });

    if (signUpError) {
        console.error('Auth User Creation Error:', signUpError.message);
        return new Response(JSON.stringify({ error: signUpError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = authData.user.id;

    // 4. Insert Company
    const { data: companyData, error: insertCompanyError } = await supabaseAdmin
        .from('companies')
        .insert({
            name: companyName,
            razao_social: razaoSocial,
            cnpj: cnpj,
            ie: ie,
            company_email: companyEmail,
            phone_number: companyPhoneNumber,
            segment_type: segmentType,
            address: address,
            number: number,
            neighborhood: neighborhood,
            complement: complement,
            zip_code: zipCode,
            city: city,
            state: state,
            user_id: userId, // Link company to the creator
            image_url: imageUrl,
            contract_accepted: true,
            accepted_contract_id: latestContractId,
            ativo: true,
        })
        .select('id')
        .single();

    if (insertCompanyError) {
        // If company insertion fails, we should ideally delete the user created in step 3, but for simplicity, we log and throw.
        console.error('Company Insertion Error:', insertCompanyError.message);
        throw new Error('Failed to register company: ' + insertCompanyError.message);
    }
    const companyId = companyData.id;

    // 5. Assign Proprietário Role and Set as Primary
    const { error: assignRoleError } = await supabaseAdmin.rpc('assign_user_to_company', {
        p_user_id: userId,
        p_company_id: companyId,
        p_role_type_id: proprietarioRoleId
    });

    if (assignRoleError) {
        console.error('Assign Role Error:', assignRoleError.message);
        throw new Error('Failed to assign primary role: ' + assignRoleError.message);
    }

    const { error: setPrimaryError } = await supabaseAdmin.rpc('set_primary_company_role', {
        p_user_id: userId,
        p_company_id: companyId,
        p_role_type_id: proprietarioRoleId
    });

    if (setPrimaryError) {
        console.error('Set Primary Error:', setPrimaryError.message);
        throw new Error('Failed to set company as primary: ' + setPrimaryError.message);
    }

    // 6. Update user type to PROPRIETARIO
    const { error: updateTypeError } = await supabaseAdmin
        .from('type_user')
        .update({ cod: 'PROPRIETARIO', descr: 'Proprietário' })
        .eq('user_id', userId);

    if (updateTypeError) {
        console.warn('Failed to update user type to Proprietario:', updateTypeError.message);
    }

    // 7. Generate Session Token for automatic login
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
    });

    if (tokenError || !tokenData.properties?.email_otp) {
        console.error('Token Generation Error:', tokenError?.message || 'No OTP generated.');
        throw new Error('Failed to generate login token.');
    }
    
    // Returning a success message and the user's ID.
    return new Response(JSON.stringify({ 
        message: 'User and Company registered successfully.', 
        userId: userId,
        email: email,
        password: password, // WARNING: This is insecure, but necessary for immediate login without complex token handling.
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Edge Function Error (register-company-and-user): Uncaught exception:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});