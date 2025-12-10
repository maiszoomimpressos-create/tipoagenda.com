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
  const [isRecoverySession, setIsRecoverySession] = useState(false); // Estado para verificar se é uma sessão de recuperação
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
    const checkSessionForRecovery = async () => {
      setLoading(true);
      const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
      console.log('ResetPasswordForm - Initial getSession:', session, 'Error:', getSessionError);

      if (getSessionError) {
        console.error('ResetPasswordForm - Error getting session:', getSessionError);
        showError('Erro ao verificar sessão: ' + getSessionError.message);
        navigate('/login', { replace: true });
        return;
      }

      if (session && session.access_token) {
        // Check if the session is specifically for password recovery
        // Supabase sets the 'type' in the URL hash, which is then processed into the session.
        // We can check the URL hash directly or rely on onAuthStateChange.
        // Let's check the URL hash as a primary indicator for this specific page.
        const params = new URLSearchParams(location.hash.substring(1));
        const typeInHash = params.get('type');
        
        if (typeInHash === 'recovery') {
          setIsRecoverySession(true);
          console.log('ResetPasswordForm useEffect - Recovery session detected via URL hash.');
        } else {
          // If there's a session but not for recovery, it's an unexpected state for this page.
          console.log('ResetPasswordForm useEffect - Session found, but not a recovery type. Redirecting.');
          showError('Sessão inválida para redefinição de senha. Por favor, solicite um novo link.');
          navigate('/login', { replace: true });
        }
      } else {
        console.log('ResetPasswordForm useEffect - No active session found. Redirecting to login.');
        showError('Sessão de redefinição de senha inválida ou expirada. Por favor, solicite um novo link.');
        navigate('/login', { replace: true });
      }
      setLoading(false);
    };

    checkSessionForRecovery();

    // Listen for auth state changes to react to token expiration or other events
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ResetPasswordForm - onAuthStateChange event:', event, 'session:', session);
      if (event === 'SIGNED_OUT' || !session) {
        console.log('ResetPasswordForm - SIGNED_OUT event or no session. Redirecting to login.');
        showError('Sessão de redefinição de senha expirada. Por favor, solicite um novo link.');
        navigate('/login', { replace: true });
      } else if (event === 'PASSWORD_RECOVERY' && session) {
        // This event confirms we are in a recovery flow
        setIsRecoverySession(true);
        console.log('ResetPasswordForm - PASSWORD_RECOVERY event detected.');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location.hash]); // Depend on location.hash to re-evaluate if hash changes

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

  if (loading || !isRecoverySession) {
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