import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMemberRequest {
  email: string;
  full_name: string;
  organization_id: string;
  role: string;
  temporary_password: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar se o header de autorização está presente
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Header de autorização ausente');
    }

    // Extrair o JWT token do header
    const token = authHeader.replace('Bearer ', '');

    // Criar cliente admin (com SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Validar o JWT token e obter dados do usuário
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error validating token:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Sua sessão expirou. Por favor, recarregue a página e tente novamente.',
          success: false,
          code: 'SESSION_EXPIRED'
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('User authenticated:', user.id);

    console.log('Creating member for user:', user.id);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    const isSuperAdmin = profile?.is_super_admin || false;

    // Parse request body
    const requestBody: CreateMemberRequest = await req.json();
    const { email, full_name, organization_id, role, temporary_password } = requestBody;

    // ⚠️ SECURITY: Never log passwords - exclude from logs
    console.log('Request data:', { email, full_name, organization_id, role });

    // Se não for super admin, verificar se é admin da organização
    if (!isSuperAdmin) {
      const { data: membership } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organization_id)
        .eq('is_active', true)
        .single();

      if (!membership || membership.role !== 'organization_admin') {
        return new Response(
          JSON.stringify({ 
            error: 'Você não tem permissão para esta ação',
            success: false,
            code: 'PERMISSION_DENIED'
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.find(u => u.email === email);

    let userId: string;

    if (userExists) {
      // Usuário já existe, vamos apenas adicioná-lo à organização
      console.log('User already exists in auth:', userExists.id);
      userId = userExists.id;

      // Verificar se profile existe
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      // Se profile não existe, criar
      if (!existingProfile) {
        console.log('Profile missing for existing user, creating...');
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: full_name,
            password_change_required: false,
            is_super_admin: false
          });

        if (profileError) {
          console.error('Error creating missing profile:', profileError);
          throw new Error('Erro ao criar perfil para usuário existente');
        }
        console.log('Missing profile created successfully');
      }

      // Verificar se já é membro da organização
      const { data: existingMember } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organization_id)
        .single();

      if (existingMember) {
        // Se já é membro ativo com o mesmo cargo, retornar erro
        if (existingMember.is_active && existingMember.role === role) {
          throw new Error('Usuário já é membro ativo desta organização com este cargo');
        }
        
        // Se é membro inativo ou com cargo diferente, atualizar
        console.log('Updating existing member...');
        const { error: updateError } = await supabaseAdmin
          .from('organization_members')
          .update({
            role,
            is_active: true,
            invited_by: user.id,
          })
          .eq('id', existingMember.id);

        if (updateError) {
          console.error('Error updating member:', updateError);
          throw updateError;
        }

        console.log('Member updated successfully');
        
        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: userId,
              email: email,
              full_name,
            },
            message: existingMember.is_active 
              ? 'Cargo do usuário atualizado com sucesso'
              : 'Usuário reativado na organização com sucesso',
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else {
      // Verificar limite de usuários da organização
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('max_users')
        .eq('id', organization_id)
        .single();

      const { count } = await supabaseAdmin
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .eq('is_active', true);

      if (count !== null && org && count >= org.max_users) {
        throw new Error(`Limite de ${org.max_users} usuários atingido`);
      }

      console.log('Creating user in auth...');

      // Criar usuário no Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporary_password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
          password_change_required: true
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      if (!newUser.user) {
        throw new Error('Erro ao criar usuário');
      }

      console.log('User created:', newUser.user.id);
      userId = newUser.user.id;

      // O trigger handle_new_user() cria o profile automaticamente
      console.log('Profile will be created automatically by trigger');
      
      // Aguardar um breve momento para o trigger processar
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Adding to organization...');

    // Adicionar à organização
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id,
        user_id: userId,
        role,
        invited_by: user.id,
        is_active: true,
      });

    if (memberError) {
      console.error('Error adding member:', memberError);
      // Se for usuário novo e falhar ao adicionar na org, deletar usuário criado
      if (!userExists) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw memberError;
    }

    console.log('Member added successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: email,
          full_name,
        },
        message: userExists 
          ? 'Usuário adicionado à organização com sucesso'
          : 'Usuário criado e adicionado à organização com sucesso',
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in create-organization-member:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao criar membro',
        success: false 
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
