import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';

// Zod schema for service registration
const serviceSchema = z.object({
  name: z.string().min(1, "O nome do serviço é obrigatório."),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        // Replace comma with dot for numeric conversion
        return val.replace(',', '.');
      }
      return val;
    },
    z.string()
      .regex(/^\d+(\.\d{1,2})?$/, "Preço inválido. Use formato 0.00 ou 0,00")
      .transform(Number)
      .refine(val => !isNaN(val), "Preço inválido.") // Ensure it's a valid number after transform
  ),
  duration_minutes: z.string().regex(/^\d+$/, "Duração inválida. Use apenas números.").transform(Number),
  category: z.string().min(1, "A categoria é obrigatória."),
  status: z.enum(['Ativo', 'Inativo'], {
    errorMap: () => ({ message: "O status é obrigatório." })
  }),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const NewServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '0.00' as any, // Cast to any because Zod expects number after transform, but we initialize with string
      duration_minutes: '0' as any, // Same here
      category: '',
      status: 'Ativo',
    },
  });

  const statusValue = watch('status');
  const categoryValue = watch('category');
  const priceValue = watch('price'); // Watch price to display formatted value

  useEffect(() => {
    if (!session && !loadingPrimaryCompany) {
      showError('Você precisa estar logado para adicionar um serviço.');
      navigate('/login');
    }
    if (!primaryCompanyId && !loadingPrimaryCompany && session) {
      showError('Você precisa ter uma empresa primária cadastrada para adicionar serviços.');
      navigate('/register-company'); // Or another appropriate page
    }
  }, [session, primaryCompanyId, loadingPrimaryCompany, navigate]);

  const onSubmit = async (data: ServiceFormValues) => {
    setLoading(true);
    if (!session?.user || !primaryCompanyId) {
      showError('Erro de autenticação ou empresa primária não encontrada.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .insert({
          company_id: primaryCompanyId,
          name: data.name,
          description: data.description,
          price: data.price,
          duration_minutes: data.duration_minutes,
          category: data.category,
          status: data.status,
        });

      if (error) {
        throw error;
      }

      showSuccess('Serviço cadastrado com sucesso!');
      reset(); // Clear form
      navigate('/servicos'); // Go back to services list
    } catch (error: any) {
      console.error('Erro ao cadastrar serviço:', error);
      showError('Erro ao cadastrar serviço: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPrimaryCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando informações da empresa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Adicionar Novo Serviço</h1>
      </div>
      <div className="max-w-2xl">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2">
                  Nome do Serviço *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Corte Tradicional"
                  {...register('name')}
                  className="mt-1 border-gray-300 text-sm"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2">
                  Descrição (Opcional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Breve descrição do serviço..."
                  {...register('description')}
                  rows={3}
                  className="mt-1 border-gray-300 text-sm resize-none"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="text-sm font-medium text-gray-700 mb-2">
                    Preço (R$) *
                  </Label>
                  <Input
                    id="price"
                    type="text" // Keep as text to allow comma input
                    placeholder="0,00"
                    {...register('price')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <Label htmlFor="duration_minutes" className="text-sm font-medium text-gray-700 mb-2">
                    Duração (minutos) *
                  </Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    placeholder="30"
                    {...register('duration_minutes')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.duration_minutes && <p className="text-red-500 text-xs mt-1">{errors.duration_minutes.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </Label>
                  <Select onValueChange={(value) => setValue('category', value, { shouldValidate: true })} value={categoryValue}>
                    <SelectTrigger id="category" className="mt-1 border-gray-300 text-sm">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cabelo">Cabelo</SelectItem>
                      <SelectItem value="Barba">Barba</SelectItem>
                      <SelectItem value="Cabelo e Barba">Cabelo e Barba</SelectItem>
                      <SelectItem value="Estética">Estética</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </Label>
                  <Select onValueChange={(value) => setValue('status', value as 'Ativo' | 'Inativo', { shouldValidate: true })} value={statusValue}>
                    <SelectTrigger id="status" className="mt-1 border-gray-300 text-sm">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="!rounded-button whitespace-nowrap cursor-pointer flex-1"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black flex-1"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Serviço'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewServicePage;