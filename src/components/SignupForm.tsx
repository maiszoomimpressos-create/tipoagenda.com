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

  // Funções de formatação removidas, pois os campos foram removidos.

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    const { email, password, firstName, lastName } = data;

    // Apenas nome e sobrenome são enviados no user_metadata
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          // Campos removidos: phone_number, cpf, birth_date, gender
        },
      },
    });
    if (error) {
      console.error("Erro no cadastro:", error); // Adicionado para depuração
      showError(error.message);
    } else {
      showSuccess('Verifique seu e-mail para confirmar o cadastro!');
    }
    setLoading(false);
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
      
      {/* Campos removidos: Número de Telefone, CPF, Data de Nascimento, Gênero */}

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