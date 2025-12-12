import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getTargetCompanyId, clearTargetCompanyId } from '@/utils/storage'; // Import storage utils

// Esquema de validação com Zod simplificado
const signupSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório."),
  lastName: z.string().min(1, "Sobrenome é obrigatório."),
  email: z.string().email("E-mail inválido.").min(1, "E-mail é obrigatório."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

const CLIENTE_ROLE_ID = 4; // Assuming CLIENTE role ID is 4

const SignupForm: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    const { email, password, firstName, lastName } = data;

    try {
      // 1. Realizar o cadastro do usuário no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signUpError) {
        console.error("Erro no cadastro:", signUpError);
        showError(signUpError.message);
        setLoading(false);
        return;
      }

      // Se o usuário foi criado (mesmo que precise de confirmação por e-mail)
      if (authData.user) {
        const newUser = authData.user;
        const targetCompanyId = getTargetCompanyId();

        // 2. Se houver um targetCompanyId, criar o registro na tabela 'clients' e 'user_companies'
        if (targetCompanyId) {
          try {
            // Inserir na tabela 'clients'
            const { error: clientInsertError } = await supabase
              .from('clients')
              .insert({
                client_auth_id: newUser.id,
                name: `${firstName} ${lastName}`,
                phone: newUser.user_metadata.phone_number || '00000000000', // Usar placeholder se não houver
                email: newUser.email || email,
                birth_date: newUser.user_metadata.birth_date || '1900-01-01', // Usar placeholder
                zip_code: '00000000', // Placeholder
                state: 'XX', // Placeholder
                city: 'N/A', // Placeholder
                address: 'N/A', // Placeholder
                number: '0', // Placeholder
                neighborhood: 'N/A', // Placeholder
                company_id: targetCompanyId, // Associar à empresa do card
              });

            if (clientInsertError) {
              // Log the specific error code and message for debugging
              console.error("Erro ao inserir cliente na tabela clients:", clientInsertError);
              throw clientInsertError;
            }

            // Chamar a função RPC para associar o usuário à empresa na tabela 'user_companies'
            const { error: assignRoleError } = await supabase.rpc('assign_user_to_company', {
              p_user_id: newUser.id,
              p_company_id: targetCompanyId,
              p_role_type_id: CLIENTE_ROLE_ID,
            });

            if (assignRoleError) {
              // Log the specific error code and message for debugging
              console.error("Erro ao associar cliente à empresa (user_companies):", assignRoleError);
              throw assignRoleError;
            }

            showSuccess('Cadastro realizado e associado à empresa com sucesso! Verifique seu e-mail para confirmar.');
            clearTargetCompanyId(); // Limpar o ID da empresa alvo após o uso
          } catch (associationError: any) {
            console.error("Erro ao associar cliente à empresa:", associationError);
            showError('Cadastro realizado, mas houve um erro ao associar à empresa: ' + associationError.message);
            // Não retornamos aqui para que a mensagem de sucesso do signup ainda seja exibida
          }
        } else {
          // Fluxo padrão se não houver targetCompanyId
          showSuccess('Verifique seu e-mail para confirmar o cadastro!');
        }
      } else {
        // Caso authData.user seja null, mas não houve signUpError (ex: email já cadastrado)
        showError('Não foi possível completar o cadastro. Verifique se o e-mail já está em uso.');
      }

    } catch (error: any) {
      console.error("Erro inesperado no cadastro:", error);
      showError('Erro inesperado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first-name">Nome</Label>
          <Input
            id="first-name"
            type="text"
            placeholder="Seu nome"
            {...register('firstName')}
            className="mt-1"
          />
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <Label htmlFor="last-name">Sobrenome</Label>
          <Input
            id="last-name"
            type="text"
            placeholder="Seu sobrenome"
            {...register('lastName')}
            className="mt-1"
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register('email')}
          className="mt-1"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="password">Crie uma senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          className="mt-1"
        />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirme a senha</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          className="mt-1"
        />
        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
      </div>
      <Button
        type="submit"
        className="w-full !rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
        disabled={loading}
      >
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </Button>
      <div className="text-center text-sm mt-4">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-yellow-600 hover:underline">
          Entrar
        </Link>
      </div>
    </form>
  );
};

export default SignupForm;