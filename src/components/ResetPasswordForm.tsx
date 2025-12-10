"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Esquema de validação com Zod
const resetPasswordSchema = z.object({
  password: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Use useLocation to get search params

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Check for access token in URL query parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search); // Read from query parameters
    const type = params.get('type');
    const accessToken = params.get('access_token'); // Supabase might still send access_token in query for recovery

    console.log('ResetPasswordForm useEffect - location.search:', location.search); // Debug log
    console.log('ResetPasswordForm useEffect - type from search params:', type); // Debug log
    console.log('ResetPasswordForm useEffect - access_token from search params:', accessToken); // Debug log

    if (type === 'recovery' && accessToken) {
      // Supabase automaticamente lida com a configuração da sessão a partir do access_token na URL
      // quando é um parâmetro de query. Precisamos apenas garantir que o usuário esteja logado para atualizar sua senha.
      // O SessionContextProvider já deve ter lidado com isso.
    } else {
      // Se não houver token de recuperação, redirecionar para login ou home
      showError('Link de redefinição de senha inválido ou expirado.');
      navigate('/login');
    }
  }, [navigate, location.search]); // Depend on location.search

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      showSuccess('Sua senha foi redefinida com sucesso! Faça login com sua nova senha.');
      navigate('/login');
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      showError('Erro ao redefinir senha: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="password">Nova Senha</Label>
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
        <Label htmlFor="confirm-password">Confirme a Nova Senha</Label>
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
        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
      </Button>
      <div className="text-center text-sm mt-4">
        <Link to="/login" className="text-yellow-600 hover:underline">
          Voltar para o Login
        </Link>
      </div>
    </form>
  );
};

export default ResetPasswordForm;