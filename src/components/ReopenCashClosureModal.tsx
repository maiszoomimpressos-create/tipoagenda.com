import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useIsProprietario } from '@/hooks/useIsProprietario';
import { showError, showSuccess } from '@/utils/toast';

interface ReopenCashClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  closureId: string;
  onReopened: () => void;
}

export const ReopenCashClosureModal: React.FC<ReopenCashClosureModalProps> = ({
  isOpen,
  onClose,
  closureId,
  onReopened,
}) => {
  const { session } = useSession();
  const { isProprietario, loadingProprietarioCheck } = useIsProprietario();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.email) {
      showError('Erro: sessão não encontrada.');
      return;
    }

    if (!isProprietario) {
      showError('Apenas proprietários podem reabrir o caixa.');
      return;
    }

    if (!password.trim()) {
      setError('Por favor, informe sua senha.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Tentar fazer login com a senha fornecida para validar
      // Como é o mesmo usuário, o Supabase mantém a sessão atualizada
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: password,
      });

      if (signInError) {
        // Verificar se é erro de credenciais inválidas
        const isInvalidCredentials = 
          signInError.message.toLowerCase().includes('invalid login credentials') ||
          (signInError.message.toLowerCase().includes('invalid') && signInError.message.toLowerCase().includes('credentials')) ||
          signInError.status === 400 ||
          signInError.code === 'invalid_credentials';

        if (isInvalidCredentials) {
          setError('Senha incorreta. Por favor, tente novamente.');
        } else {
          setError('Erro ao verificar senha. Por favor, tente novamente.');
        }
        setLoading(false);
        return;
      }

      // Se chegou aqui, a senha está correta
      // O signInWithPassword com o mesmo usuário mantém a sessão, então não precisamos restaurar

      // Deletar o fechamento de caixa
      const { data: deletedData, error: deleteError } = await supabase
        .from('cash_register_closures')
        .delete()
        .eq('id', closureId)
        .select();

      if (deleteError) {
        console.error('[ReopenCashClosureModal] Erro ao deletar fechamento:', deleteError);
        throw deleteError;
      }

      console.log('[ReopenCashClosureModal] Fechamento deletado:', {
        closureId,
        deletedRecords: deletedData,
        timestamp: new Date().toISOString()
      });

      // Verificar se realmente foi deletado
      const { data: verifyData, error: verifyError } = await supabase
        .from('cash_register_closures')
        .select('id')
        .eq('id', closureId)
        .maybeSingle();

      if (verifyError && verifyError.code !== 'PGRST116') {
        console.error('[ReopenCashClosureModal] Erro ao verificar deleção:', verifyError);
      }

      if (verifyData) {
        console.warn('[ReopenCashClosureModal] ATENÇÃO: Fechamento ainda existe após deleção!', verifyData);
        throw new Error('O fechamento não foi deletado corretamente. Tente novamente.');
      }

      showSuccess('Caixa reaberto com sucesso! O período agora está disponível para novas movimentações.');
      handleClose();
      onReopened();
    } catch (err: any) {
      console.error('Erro ao reabrir caixa:', err);
      setError(err.message || 'Erro ao reabrir o caixa. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProprietarioCheck) {
    return null;
  }

  if (!isProprietario) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Permissão Negada</DialogTitle>
            <DialogDescription>
              Apenas proprietários podem reabrir o caixa.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reabrir Caixa</DialogTitle>
          <DialogDescription>
            Para reabrir este fechamento de caixa, é necessário confirmar sua senha de proprietário.
            Esta ação permitirá que novas movimentações sejam registradas no período fechado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Senha do Proprietário</Label>
            <Input
              id="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoFocus
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !password.trim()}
            >
              {loading ? 'Verificando...' : 'Confirmar Reabertura'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

