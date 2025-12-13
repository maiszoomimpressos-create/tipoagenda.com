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
        const targetCompanyId = getTargetCompanyId(); // Still get it to clear it later

        // 2. Criar o registro na tabela 'clients' para o novo usuário
        try {
          const { error: clientInsertError } = await supabase
            .from('clients')
            .insert({
              client_auth_id: newUser.id,
              user_id: newUser.id, // Definir user_id como o ID do próprio cliente para auto-cadastro
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
              company_id: null, // Clients are not tied to a single company in 'clients' table
            });

          if (clientInsertError) {
            console.error("Erro ao inserir cliente na tabela clients:", clientInsertError);
            throw clientInsertError;
          }

          // REMOVIDO: Inserção na tabela user_companies com CLIENTE_ROLE_ID.
          // Um cliente não é um 'membro' de uma empresa no mesmo sentido que um colaborador.
          // A associação cliente-empresa para agendamentos é feita na tabela 'appointments'.
          // O tipo de usuário 'CLIENTE' já é definido pelo trigger handle_new_user.

          showSuccess('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.');
          clearTargetCompanyId(); // Limpar o ID da empresa alvo após o uso
        } catch (clientCreationError: any) {
          console.error("Erro ao criar registro de cliente:", clientCreationError);
          showError('Cadastro realizado, mas houve um erro ao criar seu perfil de cliente: ' + clientCreationError.message);
        }
      } else {
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