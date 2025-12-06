import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';

// Zod schema for company registration
const companySchema = z.object({
  name: z.string().min(1, "Nome da empresa é obrigatório."),
  segment_type: z.string().min(1, "Segmento é obrigatório."),
  company_logo: z.any()
    .refine((files) => files?.length === 0 || files?.[0]?.size <= 5000000, `Tamanho máximo da imagem é 5MB.`)
    .refine((files) => files?.length === 0 || ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type), `Apenas .jpg, .png e .webp são aceitos.`)
    .optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const CompanyRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      segment_type: '',
    },
  });

  const segmentTypeValue = watch('segment_type');

  const onSubmit = async (data: CompanyFormValues) => {
    setLoading(true);
    if (!session?.user) {
      showError('Você precisa estar logado para registrar uma empresa.');
      setLoading(false);
      return;
    }

    let imageUrl: string | null = null;

    // Handle file upload if a file is selected
    if (data.company_logo && data.company_logo.length > 0) {
      const file = data.company_logo[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `company_logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company_logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        showError('Erro ao fazer upload da imagem: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('company_logos')
        .getPublicUrl(filePath);
      
      imageUrl = publicUrlData.publicUrl;
    }

    // Insert company data into Supabase
    const { error: insertError } = await supabase
      .from('companies')
      .insert({
        name: data.name,
        segment_type: data.segment_type,
        user_id: session.user.id,
        image_url: imageUrl,
      });

    if (insertError) {
      showError('Erro ao cadastrar empresa: ' + insertError.message);
      setLoading(false);
      return;
    }

    showSuccess('Empresa cadastrada com sucesso!');
    navigate('/dashboard'); // Redirect to dashboard after successful registration
    setLoading(false);
  };

  const segmentOptions = [
    { value: 'beleza', label: 'Beleza & Estética' },
    { value: 'saude', label: 'Saúde & Bem-estar' },
    { value: 'fitness', label: 'Fitness & Personal' },
    { value: 'educacao', label: 'Educação & Coaching' },
    { value: 'negocios', label: 'Consultoria & Negócios' },
    { value: 'casa', label: 'Casa & Manutenção' },
    { value: 'auto', label: 'Automotivo' },
    { value: 'pet', label: 'Pet Care' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
        <CardHeader className="relative text-center pb-6">
          <Button
            variant="ghost"
            className="absolute left-0 top-0 !rounded-button whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-3xl font-extrabold text-gray-900 dark:text-white mt-8">
            Cadastre Sua Empresa
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Preencha os dados para registrar sua empresa na plataforma.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Empresa</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nome da sua empresa"
                {...register('name')}
                className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="segment_type" className="text-sm font-medium text-gray-700 dark:text-gray-300">Segmento</Label>
              <Select onValueChange={(value) => setValue('segment_type', value, { shouldValidate: true })} value={segmentTypeValue}>
                <SelectTrigger id="segment_type" className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500">
                  <SelectValue placeholder="Selecione o segmento da empresa" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-white">
                  {segmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.segment_type && <p className="text-red-500 text-xs mt-1">{errors.segment_type.message}</p>}
            </div>
            <div>
              <Label htmlFor="company_logo" className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo da Empresa (opcional)</Label>
              <Input
                id="company_logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                {...register('company_logo')}
                className="mt-2 file:text-sm file:font-semibold file:bg-yellow-600 file:text-black file:border-none file:rounded-button file:px-4 file:py-2 file:mr-4 hover:file:bg-yellow-700 dark:file:bg-yellow-700 dark:file:text-black dark:text-gray-300 dark:border-gray-600"
              />
              {errors.company_logo && <p className="text-red-500 text-xs mt-1">{errors.company_logo.message}</p>}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Apenas .jpg, .png, .webp. Máximo 5MB.</p>
            </div>
            <Button
              type="submit"
              className="w-full !rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black font-semibold py-2.5 text-base"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyRegistrationPage;