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

// Esquema de validação com Zod
const signupSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório."),
  lastName: z.string().min(1, "Sobrenome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  phoneNumber: z.string()
    .min(1, "Número de telefone é obrigatório.")
    .regex(/^\(\d{2}\)\s\d{5}-\d{4}$/, "Formato de telefone inválido (ex: (XX) XXXXX-XXXX)"),
  cpf: z.string()
    .min(1, "CPF é obrigatório.")
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "Formato de CPF inválido (ex: XXX.XXX.XXX-XX)"),
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      cpf: '',
      password: '',
      confirmPassword: '',
    },
  });

  const phoneNumberValue = watch('phoneNumber');
  const cpfValue = watch('cpf');

  const formatPhoneNumberInput = (value: string) => {
    if (!value) return '';
    let cleaned = value.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11); // Limit to 11 digits

    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    } else if (cleaned.length <= 7) { // (XX) XXXXX
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
    } else if (cleaned.length <= 11) { // (XX) XXXXX-XXXX
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    return cleaned;
  };

  const formatCpfInput = (value: string) => {
    if (!value) return '';
    let cleaned = value.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11); // Limit to 11 digits

    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3)}`;
    } else if (cleaned.length <= 9) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6)}`;
    } else {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9)}`;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumberInput(e.target.value);
    setValue('phoneNumber', formattedValue, { shouldValidate: true });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCpfInput(e.target.value);
    setValue('cpf', formattedValue, { shouldValidate: true });
  };

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true);
    const { email, password, firstName, lastName, phoneNumber, cpf } = data;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber.replace(/\D/g, ''), // Store only digits
          cpf: cpf.replace(/\D/g, ''), // Store only digits
        },
      },
    });
    if (error) {
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
      <div>
        <Label htmlFor="phone-number">Número de Telefone</Label>
        <Input
          id="phone-number"
          type="tel"
          placeholder="(XX) XXXXX-XXXX"
          value={phoneNumberValue}
          onChange={handlePhoneNumberChange}
          maxLength={15}
          className="mt-1"
        />
        {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber.message}</p>}
      </div>
      <div>
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          type="text"
          placeholder="XXX.XXX.XXX-XX"
          value={cpfValue}
          onChange={handleCpfChange}
          maxLength={14}
          className="mt-1"
        />
        {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf.message}</p>}
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