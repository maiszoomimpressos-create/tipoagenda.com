import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

// Zod schema for API Keys
const apiKeysSchema = z.object({
  payment_api_key: z.string().optional(),
  payment_secret_token: z.string().optional(),
  // Adicione outros campos conforme necessário (ex: webhook secret)
});

type ApiKeysFormValues = z.infer<typeof apiKeysSchema>;

// NOTE: In a real application, these keys should be stored securely as Supabase Secrets
// and accessed via Edge Functions, not directly in the database via RLS.
// For this implementation, we will simulate storing them in a dedicated table
// or using a placeholder until proper secret management is integrated.
// Since we don't have a dedicated table for global secrets, we will use a placeholder
// and focus on the UI/UX for now.

const ApiKeysPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApiKeysFormValues>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: {
      payment_api_key: '',
      payment_secret_token: '',
    },
  });

  // Placeholder for fetching existing keys (if they were stored in a global config table)
  const fetchApiKeys = useCallback(async () => {
    // Since we don't have a global config table, we skip fetching for now.
    // In a real scenario, this would fetch the current keys (masked) from a secure source.
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const onSubmit = async (data: ApiKeysFormValues) => {
    setIsSaving(true);
    
    // IMPORTANT: In a real application, this data should be sent to a secure backend
    // (like a Supabase Edge Function with Service Role Key) to be stored as environment secrets,
    // NOT directly into a public database table.
    
    // Simulation of saving keys:
    console.log("Simulating saving API Keys:", data);
    
    // Since we cannot modify Supabase secrets directly from the client,
    // we will just show a success message for the UI demonstration.
    
    // If we had a global config table:
    /*
    try {
      const { error } = await supabase
        .from('global_config')
        .upsert({ id: 'payment_keys', ...data });
      
      if (error) throw error;
      showSuccess('Chaves de API salvas com sucesso!');
    } catch (error: any) {
      showError('Erro ao salvar chaves: ' + error.message);
      console.error('Error saving API keys:', error);
    }
    */
    
    showSuccess('Chaves de API salvas com sucesso (Simulação)!');
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate('/admin-dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Chaves de Pagamento</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Key className="h-6 w-6 text-yellow-600" />
              Configuração de Checkout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-6">
              Insira as chaves de API e tokens secretos do seu provedor de pagamento (ex: Stripe, PagSeguro, etc.) para habilitar o checkout.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="payment_api_key" className="text-sm font-medium text-gray-700 mb-2">
                  Chave de API Pública (Token)
                </Label>
                <Input
                  id="payment_api_key"
                  type="text"
                  placeholder="pk_live_xxxxxxxxxxxxxxxxxxxx"
                  {...register('payment_api_key')}
                  className="mt-2 h-10 border-gray-300 text-sm"
                />
                {errors.payment_api_key && <p className="text-red-500 text-xs mt-1">{errors.payment_api_key.message}</p>}
              </div>
              <div>
                <Label htmlFor="payment_secret_token" className="text-sm font-medium text-gray-700 mb-2">
                  Chave Secreta (Secret Key)
                </Label>
                <Input
                  id="payment_secret_token"
                  type="password"
                  placeholder="sk_live_xxxxxxxxxxxxxxxxxxxx"
                  {...register('payment_secret_token')}
                  className="mt-2 h-10 border-gray-300 text-sm"
                />
                {errors.payment_secret_token && <p className="text-red-500 text-xs mt-1">{errors.payment_secret_token.message}</p>}
              </div>
              
              <Button
                type="submit"
                className="w-full !rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black font-semibold py-2.5 text-base"
                disabled={isSaving || loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Chaves'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiKeysPage;