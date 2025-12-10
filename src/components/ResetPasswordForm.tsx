"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod'; // Corrigido: de '*s z' para '* as z'

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
  const [hasSession, setHasSession] = useState(false); // Novo estado para verificar se há sessão
  const navigate = useNavigate();
  const location = useLocation();

  console.log('ResetPasswordForm - Render - window.location.href:', window.location.href);
  console.log('ResetPasswordForm - Render - window.location.hash:', window.location.hash);
  console.log('ResetPasswordForm - Render - window.location.search:', window.location.search);

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

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ResetPasswordForm - onAuthStateChange event:', event, 'session:', session);
      if (session && session.access_token) {
        setHasSession(true);
        console.log('ResetPasswordForm useEffect - Session detected, allowing password reset.');
      } else {
        setHasSession(false);
        console.log('ResetPasswordForm useEffect - No session detected, redirecting to login.');
        showError('Sessão de redefinição de senha inválida ou expirada. Por favor, solicite um novo link.');
        navigate('/login', { replace: true });
      }
    });

    // Não precisamos de uma verificação inicial de URL aqui, onAuthStateChange é o suficiente.
    // Apenas para garantir que o estado inicial esteja correto se a página for carregada diretamente com um hash de recuperação
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.access_token) {
        setHasSession(true);
        console.log('ResetPasswordForm useEffect - Initial getSession detected session.');
      } else {
        setHasSession(false);
        console.log('ResetPasswordForm useEffect - Initial getSession found no session, redirecting.');
        // Não redirecionar aqui, pois o listener acima já fará isso se necessário.
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

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
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      showError('Erro ao redefinir senha: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasSession) {
    return (
      <div className="text-center text-gray-700 dark:text-gray-300">
        Verificando sessão de redefinição de senha...
      </div>
    );
  }

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