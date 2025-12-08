import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client'; // Assuming client registration will use supabase

// Zod schema for new client registration
const newClientSchema = z.object({
  nome: z.string().min(1, "Nome completo é obrigatório."),
  telefone: z.string()
    .min(1, "Telefone é obrigatório.")
    .regex(/^\(\d{2}\)\s\d{5}-\d{4}$/, "Formato de telefone inválido (ex: (XX) XXXXX-XXXX)"),
  email: z.string().email("E-mail inválido.").optional().or(z.literal('')),
  nascimento: z.string()
    .min(1, "Data de nascimento é obrigatória.")
    .refine((val) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to compare only date part
      const birthDate = new Date(val);
      return birthDate <= today;
    }, "Data de nascimento não pode ser no futuro."),
  endereco: z.string().optional(),
  observacoes: z.string().max(500, "Máximo de 500 caracteres.").optional(),
  status: z.string().optional(), // Assuming default value or selection
  pontos: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0, "Pontos não podem ser negativos.").optional()
  ),
});

type NewClientFormValues = z.infer<typeof newClientSchema>;

const NovoClientePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      email: '',
      nascimento: '',
      endereco: '',
      observacoes: '',
      status: 'novo',
      pontos: 0,
    },
  });

  const telefoneValue = watch('telefone');

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

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumberInput(e.target.value);
    setValue('telefone', formattedValue, { shouldValidate: true });
  };

  const onSubmit = async (data: NewClientFormValues) => {
    setLoading(true);
    try {
      // Here you would typically insert the new client into your database
      // For now, we'll just log the data and show a success message
      console.log('Dados do novo cliente:', data);
      showSuccess('Cliente cadastrado com sucesso!');
      navigate('/clientes'); // Navigate back to clients list
    } catch (error: any) {
      console.error('Erro ao cadastrar cliente:', error);
      showError('Erro ao cadastrar cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Novo Cliente</h1>
      </div>
      <div className="max-w-2xl">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">
                    Nome Completo *
                  </Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Digite o nome completo"
                    {...register('nome')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                </div>
                <div>
                  <Label htmlFor="telefone">
                    Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(XX) XXXXX-XXXX"
                    value={telefoneValue}
                    onChange={handlePhoneNumberChange}
                    maxLength={15}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="cliente@email.com"
                    {...register('email')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="nascimento">
                    Data de Nascimento *
                  </Label>
                  <Input
                    id="nascimento"
                    type="date"
                    {...register('nascimento')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.nascimento && <p className="text-red-500 text-xs mt-1">{errors.nascimento.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="endereco">
                  Endereço Completo
                </Label>
                <Input
                  id="endereco"
                  type="text"
                  placeholder="Rua, número, bairro, cidade, CEP"
                  {...register('endereco')}
                  className="mt-1 border-gray-300 text-sm"
                />
                {errors.endereco && <p className="text-red-500 text-xs mt-1">{errors.endereco.message}</p>}
              </div>
              <div>
                <Label htmlFor="observacoes">
                  Preferências e Observações
                </Label>
                <textarea
                  id="observacoes"
                  maxLength={500}
                  {...register('observacoes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24 resize-none mt-1"
                  placeholder="Corte preferido, alergias, observações especiais..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Máximo 500 caracteres</p>
                {errors.observacoes && <p className="text-red-500 text-xs mt-1">{errors.observacoes.message}</p>}
              </div>
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Iniciais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">
                      Status do Cliente
                    </Label>
                    <select
                      id="status"
                      {...register('status')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1"
                    >
                      <option value="novo">Novo Cliente</option>
                      <option value="regular">Regular</option>
                      <option value="vip">VIP</option>
                    </select>
                    {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="pontos">
                      Pontos Iniciais
                    </Label>
                    <Input
                      id="pontos"
                      type="number"
                      defaultValue="0"
                      {...register('pontos')}
                      className="mt-1 border-gray-300 text-sm"
                      min="0"
                    />
                    {errors.pontos && <p className="text-red-500 text-xs mt-1">{errors.pontos.message}</p>}
                  </div>
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
                  {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovoClientePage;