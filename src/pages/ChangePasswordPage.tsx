import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useIsTemporaryPassword } from '@/hooks/useIsTemporaryPassword';
import { useSession } from '@/components/SessionContextProvider';

const changePasswordSchema = z.object({
  password: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, loading: sessionLoading } = useSession();
  const { isTemporaryPassword, loading: loadingTemporaryCheck } = useIsTemporaryPassword();
  const [loading, setLoading] = useState(false);
  const isTemporaryParam = searchParams.get('temporary') === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Se não estiver logado, redirecionar para login
    if (!sessionLoading && !session) {
      showError('Você precisa estar logado para alterar sua senha.');
      navigate('/login', { replace: true });
      return;
    }

    // Se não for senha temporária e não tiver o parâmetro temporary, redirecionar
    if (!sessionLoading && session && !isTemporaryPassword && !isTemporaryParam) {
      showError('Esta página é apenas para usuários com senha temporária.');
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [session, sessionLoading, isTemporaryPassword, isTemporaryParam, navigate]);

  const onSubmit = async (data: ChangePasswordFormValues) => {
    if (!session?.user) {
      showError('Você precisa estar logado para alterar sua senha.');
      return;
    }

    setLoading(true);
    try {
      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw updateError;
      }

      // Remover flag is_temporary_password do user_metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          is_temporary_password: false,
        },
      });

      if (metadataError) {
        console.warn('Erro ao atualizar metadata (não crítico):', metadataError);
        // Não falha o processo, apenas loga o aviso
      }

      showSuccess('Sua senha foi alterada com sucesso!');
      
      // Redirecionar baseado no tipo de usuário
      // Se for colaborador, redirecionar para tela de colaborador
      const { data: typeUserData } = await supabase
        .from('type_user')
        .select('cod')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const cod = (typeUserData?.cod || '').toUpperCase();
      
      if (cod === 'COLABORADOR') {
        navigate('/colaborador/agendamentos', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      showError('Erro ao alterar senha: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loadingTemporaryCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Verificando permissões...</p>
      </div>
    );
  }

  if (!session) {
    return null; // useEffect vai redirecionar
  }

  if (!isTemporaryPassword && !isTemporaryParam) {
    return null; // useEffect vai redirecionar
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Alterar Senha</CardTitle>
          <p className="text-sm text-gray-600 text-center mt-2">
            Você está usando uma senha temporária. Por favor, defina uma nova senha para continuar.
          </p>
        </CardHeader>
        <CardContent>
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
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;

