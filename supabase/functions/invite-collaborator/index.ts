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

    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError: any) {
      console.error('Edge Function Error (invite-collaborator): Failed to parse request body:', parseError.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body: ' + parseError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { companyId: requestedCompanyId, firstName, lastName, email, phoneNumber, hireDate, roleTypeId, commissionPercentage, status, avatarUrl } = requestData;

    console.log('Edge Function Debug (invite-collaborator): Received data:', { requestedCompanyId, firstName, lastName, email, phoneNumber, hireDate, roleTypeId, commissionPercentage, status, avatarUrl });
    console.log('Edge Function Debug (invite-collaborator): Authenticated user ID:', user.id);

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

    // SEGURANÇA: Capturar company_id automaticamente do usuário logado
    // Primeiro, buscar empresa primária do usuário
    let companyId: string | null = null;
    const { data: primaryCompany, error: primaryCompanyError } = await supabaseAdmin
      .from('user_companies')
      .select('company_id, role_type')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (primaryCompanyError && primaryCompanyError.code !== 'PGRST116') {
      console.error('Edge Function Error (invite-collaborator): Erro ao buscar empresa primária:', primaryCompanyError);
      return new Response(JSON.stringify({ 
        error: 'Erro ao identificar sua empresa. Verifique se você está associado a uma empresa.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (primaryCompany?.company_id) {
      companyId = primaryCompany.company_id;
      console.log('Edge Function Debug (invite-collaborator): Empresa primária encontrada:', companyId);
    } else {
      // Se não tem primária, buscar qualquer empresa
      const { data: anyCompany, error: anyCompanyError } = await supabaseAdmin
        .from('user_companies')
        .select('company_id, role_type')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (anyCompanyError && anyCompanyError.code !== 'PGRST116') {
        console.error('Edge Function Error (invite-collaborator): Erro ao buscar empresa:', anyCompanyError);
        return new Response(JSON.stringify({ 
          error: 'Erro ao identificar sua empresa. Verifique se você está associado a uma empresa.' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (anyCompany?.company_id) {
        companyId = anyCompany.company_id;
        console.log('Edge Function Debug (invite-collaborator): Empresa encontrada (não primária):', companyId);
      }
    }

    // VALIDAÇÃO CRÍTICA: Se não conseguiu identificar empresa, abortar
    if (!companyId) {
      console.error('Edge Function Error (invite-collaborator): Não foi possível identificar a empresa do usuário logado');
      return new Response(JSON.stringify({ 
        error: 'Não foi possível identificar sua empresa. Verifique se você está associado a uma empresa antes de cadastrar colaboradores.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SEGURANÇA: Se foi enviado companyId no request, validar que é o mesmo do usuário logado
    if (requestedCompanyId && requestedCompanyId !== companyId) {
      console.error('Edge Function Error (invite-collaborator): Tentativa de criar colaborador em empresa diferente da do usuário logado');
      console.error('Edge Function Debug (invite-collaborator): requestedCompanyId:', requestedCompanyId, 'userCompanyId:', companyId);
      return new Response(JSON.stringify({ 
        error: 'Você não tem permissão para criar colaboradores nesta empresa.' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validação detalhada com mensagens específicas (removido companyId da validação)
    const missingFields: string[] = [];
    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');
    if (!email) missingFields.push('email');
    if (!phoneNumber) missingFields.push('phoneNumber');
    if (!hireDate) missingFields.push('hireDate');
    if (!roleTypeId && roleTypeId !== 0) missingFields.push('roleTypeId');
    if (commissionPercentage === undefined || commissionPercentage === null) missingFields.push('commissionPercentage');
    if (!status) missingFields.push('status');

    if (missingFields.length > 0) {
      console.error('Edge Function Error (invite-collaborator): Missing required collaborator data:', missingFields);
      return new Response(JSON.stringify({ 
        error: `Dados obrigatórios faltando: ${missingFields.join(', ')}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if the calling user (user.id) is an admin/proprietor of the companyId
    console.log('Edge Function Debug (invite-collaborator): Verificando role para user_id:', user.id, 'company_id:', companyId);
    
    const { data: userCompanyRoles, error: roleError } = await supabaseAdmin
      .from('user_companies')
      .select('role_type')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (roleError) {
      console.error('Edge Function Error (invite-collaborator): Role check error -', roleError.message);
      console.error('Edge Function Debug (invite-collaborator): roleError details:', JSON.stringify(roleError, null, 2));
      return new Response(JSON.stringify({ error: 'Forbidden: User not authorized for this company - ' + roleError.message }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userCompanyRoles || !userCompanyRoles.role_type) {
      console.error('Edge Function Error (invite-collaborator): User not found in user_companies or role_type is null');
      console.error('Edge Function Debug (invite-collaborator): userCompanyRoles:', JSON.stringify(userCompanyRoles, null, 2));
      console.error('Edge Function Debug (invite-collaborator): user_id:', user.id, 'company_id:', companyId);
      
      // Verifica se o usuário existe em user_companies para outras empresas (para debug)
      const { data: allUserCompanies } = await supabaseAdmin
        .from('user_companies')
        .select('company_id, role_type')
        .eq('user_id', user.id);
      console.error('Edge Function Debug (invite-collaborator): Todas as empresas do usuário:', JSON.stringify(allUserCompanies, null, 2));
      
      return new Response(JSON.stringify({ 
        error: `Você não tem permissão para criar colaboradores nesta empresa. Verifique se você é Proprietário ou Admin da empresa (ID: ${companyId}).` 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Edge Function Debug (invite-collaborator): role_type encontrado:', userCompanyRoles.role_type);

    const { data: roleTypeData, error: roleTypeFetchError } = await supabaseAdmin
      .from('role_types')
      .select('description')
      .eq('id', userCompanyRoles.role_type)
      .maybeSingle();

    if (roleTypeFetchError) {
      console.error('Edge Function Error (invite-collaborator): Role type fetch error -', roleTypeFetchError.message);
      console.error('Edge Function Debug (invite-collaborator): roleTypeFetchError details:', JSON.stringify(roleTypeFetchError, null, 2));
      return new Response(JSON.stringify({ error: 'Forbidden: Error checking user privileges - ' + roleTypeFetchError.message }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!roleTypeData || !roleTypeData.description) {
      console.error('Edge Function Error (invite-collaborator): Role type not found or description is null');
      console.error('Edge Function Debug (invite-collaborator): roleTypeData:', JSON.stringify(roleTypeData, null, 2));
      return new Response(JSON.stringify({ error: 'Forbidden: User role type not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificação mais robusta: trim, normalize e case-insensitive
    const roleDescription = roleTypeData.description.trim().toLowerCase();
    const allowedRoles = ['proprietário', 'admin', 'proprietario']; // Inclui variações
    const hasPermission = allowedRoles.some(allowed => {
      const normalizedAllowed = allowed.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
      const normalizedRole = roleDescription.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove acentos
      return normalizedAllowed === normalizedRole;
    });

    console.log('Edge Function Debug (invite-collaborator): Role description:', roleDescription);
    console.log('Edge Function Debug (invite-collaborator): Has permission:', hasPermission);

    if (!hasPermission) {
      console.error('Edge Function Error (invite-collaborator): User does not have sufficient privileges');
      console.error('Edge Function Debug (invite-collaborator): User role:', roleDescription, 'Allowed roles:', allowedRoles);
      return new Response(JSON.stringify({ 
        error: `Você não tem permissão para criar colaboradores. Seu papel atual: "${roleDescription}". É necessário ser "Proprietário" ou "Admin" da empresa.` 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let invitedAuthUser = null;
    let inviteOperationError = null;
    let inviteOperationMessage = '';
    let emailSent = false;
    let emailError: string | null = null;

    // Função para gerar senha temporária segura
    const generateTemporaryPassword = (): string => {
      const length = 12;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
      let password = '';
      // Garantir pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      password += '0123456789'[Math.floor(Math.random() * 10)];
      password += '!@#$%&*'[Math.floor(Math.random() * 7)];
      // Preencher o resto
      for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
      }
      // Embaralhar
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };

    // REMOVIDO: Verificação prévia de usuário existente - causa falsos positivos
    // Vamos tentar criar diretamente e tratar o erro se o usuário já existir
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Edge Function Debug (invite-collaborator): Tentando criar novo usuário com email:', normalizedEmail);
    console.log('Edge Function Debug (invite-collaborator): Email original recebido:', email);
    
    // Gerar senha temporária
    const temporaryPassword = generateTemporaryPassword();
    console.log('Edge Function Debug (invite-collaborator): Senha temporária gerada (primeiros 3 caracteres):', temporaryPassword.substring(0, 3) + '***');
    
    // Tentar criar usuário diretamente - se já existir, o Supabase retornará erro específico
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail, // Normalizar email
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        hire_date: hireDate,
        role_type_id: roleTypeId,
        commission_percentage: commissionPercentage,
        status: status,
        avatar_url: avatarUrl || null,
        is_temporary_password: true,
      },
    });

    if (createUserError) {
      // Verificar se o erro é porque o usuário já existe
      const errorMessage = (createUserError.message || '').toLowerCase();
      const errorStatus = createUserError.status || 0;
      
      const isUserExistsError = errorMessage.includes('already registered') || 
                                errorMessage.includes('user already exists') ||
                                errorMessage.includes('already exists') ||
                                errorMessage.includes('duplicate') ||
                                errorStatus === 422 ||
                                errorStatus === 400;
      
      if (isUserExistsError) {
        console.log('Edge Function Debug (invite-collaborator): Usuário já existe (erro do Supabase).');
        return new Response(JSON.stringify({ 
          error: 'Já existe um usuário cadastrado com este e-mail. Por favor, use outro e-mail.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Outro tipo de erro na criação
      console.error('Edge Function Error (invite-collaborator): Error creating user:', createUserError);
      inviteOperationError = createUserError;
      inviteOperationMessage = 'Erro ao criar usuário para colaborador: ' + createUserError.message;
    } else {
      // Usuário criado com sucesso
      invitedAuthUser = newUser.user;
      inviteOperationMessage = 'Colaborador criado com sucesso. Email com credenciais será enviado.';
      console.log('Edge Function Debug (invite-collaborator): Usuário criado com sucesso:', invitedAuthUser.id);
      
      // Criar registro em type_user com cod 'COLABORADOR'
      const { error: typeUserError } = await supabaseAdmin
        .from('type_user')
        .upsert({
          user_id: invitedAuthUser.id,
          cod: 'COLABORADOR',
          descr: 'Colaborador',
        }, {
          onConflict: 'user_id',
        });
      
      if (typeUserError) {
        console.error('Edge Function Error (invite-collaborator): Error creating type_user:', typeUserError);
        // Não falha o processo, apenas loga o erro
      }
      
      // Enviar email com credenciais - DIRETO VIA RESEND API (igual ao cadastro de empresa)
      const siteUrl = Deno.env.get('SITE_URL') || 'https://tipoagenda.com';
      const loginUrl = `${siteUrl}/login`;
      
      console.log('Edge Function Debug (invite-collaborator): Enviando email de boas-vindas para:', email);
      
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      
      if (!RESEND_API_KEY) {
        console.warn('Edge Function Warning (invite-collaborator): RESEND_API_KEY não configurada. Email não será enviado.');
        console.warn('Edge Function Warning (invite-collaborator): Configure no Supabase: Edge Functions > invite-collaborator > Settings > Secrets.');
        emailError = 'RESEND_API_KEY não configurada';
      } else {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .button { display: inline-block; padding: 12px 24px; background-color: #F59E0B; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                .credentials { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>Bem-vindo ao TipoAgenda!</h2>
                <p>Olá ${firstName} ${lastName},</p>
                <p>Você foi cadastrado como colaborador no sistema TipoAgenda. Utilize as credenciais abaixo para acessar o sistema:</p>
                
                <div class="credentials">
                  <p><strong>E-mail:</strong> ${normalizedEmail}</p>
                  <p><strong>Senha temporária:</strong> <code style="background-color: #fff; padding: 2px 4px; border: 1px solid #ddd; border-radius: 3px; font-family: monospace;">${temporaryPassword}</code></p>
                </div>
                
                <p><strong>Importante:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Use o e-mail <strong>exatamente</strong> como mostrado acima (em minúsculas)</li>
                  <li>Copie a senha temporária com cuidado, incluindo todos os caracteres especiais</li>
                  <li>Ao fazer o primeiro login, você será solicitado a alterar sua senha por uma senha de sua escolha</li>
                </ul>
                
                <p><a href="${loginUrl}" class="button">Acessar Sistema</a></p>
                
                <p>Ou copie e cole este link no seu navegador:</p>
                <p style="word-break: break-all; color: #0066cc;">${loginUrl}</p>
                
                <div class="footer">
                  <p>Se você não foi cadastrado, entre em contato com o administrador do sistema.</p>
                  <p>© TipoAgenda - Todos os direitos reservados</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'TipoAgenda <noreply@tipoagenda.com>',
              to: normalizedEmail, // Usar email normalizado
              subject: 'Bem-vindo ao TipoAgenda - Credenciais de Acesso',
              html: emailHtml,
            }),
          });

          const resendData = await resendResponse.json();

          if (resendResponse.ok) {
            emailSent = true;
            console.log('Edge Function Debug (invite-collaborator): Email de boas-vindas enviado com sucesso via Resend API para:', email);
          } else {
            emailError = `Resend API error: ${JSON.stringify(resendData)}`;
            console.error('Edge Function Error (invite-collaborator): Resend API error:', resendData);
            
            if (resendData.statusCode === 403 && resendData.message?.includes('testing emails')) {
              console.warn('Edge Function Warning (invite-collaborator): Resend está em modo de teste. Você só pode enviar emails para o email da sua conta do Resend.');
            }
          }
        } catch (resendErr: any) {
          emailError = `Resend API exception: ${resendErr.message}`;
          console.error('Edge Function Error (invite-collaborator): Resend API exception:', resendErr.message);
        }
      }
      
      // Se o email falhou, logar mas não bloquear o processo
      if (!emailSent) {
        console.warn('Edge Function Warning (invite-collaborator): Colaborador criado, mas email NÃO foi enviado. Erro:', emailError);
        console.warn('Edge Function Warning (invite-collaborator): Credenciais do colaborador:', {
          email: normalizedEmail,
          temporaryPassword: temporaryPassword,
        });
      } else {
        // Log das credenciais para debug (apenas se email foi enviado)
        console.log('Edge Function Debug (invite-collaborator): Email enviado com sucesso. Credenciais:', {
          email: normalizedEmail,
          temporaryPasswordLength: temporaryPassword.length,
          passwordStartsWith: temporaryPassword.substring(0, 2) + '***',
        });
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

    // CRITICAL: Verificar assinatura ANTES de chamar assign_user_to_company
    console.log('Edge Function Debug (invite-collaborator): Verificando assinatura ANTES de assign_user_to_company para company_id:', companyId);
    const { data: subscriptionBefore, error: subCheckErrorBefore } = await supabaseAdmin
      .from('company_subscriptions')
      .select('id, company_id, plan_id, status, start_date, end_date')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subCheckErrorBefore && subCheckErrorBefore.code !== 'PGRST116') {
      console.error('Edge Function Error (invite-collaborator): Erro ao verificar assinatura ANTES:', subCheckErrorBefore);
    } else {
      console.log('Edge Function Debug (invite-collaborator): Assinatura ANTES de assign_user_to_company:', subscriptionBefore);
    }

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

    // CRITICAL: Verificar assinatura DEPOIS de chamar assign_user_to_company
    console.log('Edge Function Debug (invite-collaborator): Verificando assinatura DEPOIS de assign_user_to_company para company_id:', companyId);
    const { data: subscriptionAfter, error: subCheckErrorAfter } = await supabaseAdmin
      .from('company_subscriptions')
      .select('id, company_id, plan_id, status, start_date, end_date')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subCheckErrorAfter && subCheckErrorAfter.code !== 'PGRST116') {
      console.error('Edge Function Error (invite-collaborator): Erro ao verificar assinatura DEPOIS:', subCheckErrorAfter);
    } else {
      console.log('Edge Function Debug (invite-collaborator): Assinatura DEPOIS de assign_user_to_company:', subscriptionAfter);
      
      // ALERTA CRÍTICO: Se a assinatura desapareceu, logar erro crítico
      if (subscriptionBefore && !subscriptionAfter) {
        console.error('🚨 CRITICAL ERROR: Assinatura foi DELETADA após assign_user_to_company!');
        console.error('🚨 Assinatura ANTES:', JSON.stringify(subscriptionBefore, null, 2));
        console.error('🚨 Assinatura DEPOIS:', 'NÃO ENCONTRADA');
      } else if (subscriptionBefore && subscriptionAfter && subscriptionBefore.id !== subscriptionAfter.id) {
        console.error('🚨 CRITICAL ERROR: Assinatura foi ALTERADA após assign_user_to_company!');
        console.error('🚨 Assinatura ANTES:', JSON.stringify(subscriptionBefore, null, 2));
        console.error('🚨 Assinatura DEPOIS:', JSON.stringify(subscriptionAfter, null, 2));
      }
    }

    // Incluir informação sobre o email na resposta
    const responseMessage = emailSent 
      ? inviteOperationMessage 
      : `${inviteOperationMessage} ATENÇÃO: O email não foi enviado. Verifique os logs.`;
    
    return new Response(JSON.stringify({ 
      message: responseMessage, 
      collaborator: collaboratorData,
      emailSent: emailSent,
      emailError: emailError || null,
    }), {
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