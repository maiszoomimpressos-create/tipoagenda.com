import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';

// Zod schema for collaborator registration
const collaboratorSchema = z.object({
  first_name: z.string().min(1, "Nome é obrigatório."),
  last_name: z.string().min(1, "Sobrenome é obrigatório."),
  email: z.string().email("E-mail inválido.").min(1, "E-mail é obrigatório."),
  phone_number: z.string()
    .min(1, "Número de telefone é obrigatório.")
    .regex(/^\(\d{2}\)\s\d{5}-\d{4}$/, "Formato de telefone inválido (ex: (XX) XXXXX-XXXX)"),
  hire_date: z.string().min(1, "Data de contratação é obrigatória."),
  role_type_id: z.string().min(1, "Função é obrigatória.").transform(Number), // Transforma para número
  commission_percentage: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val.replace(',', '.');
      }
      return val;
    },
    z.string()
      .regex(/^\d+(\.\d{1,2})?$/, "Percentual de comissão inválido. Use formato 0.00 ou 0,00")
      .transform(Number)
      .refine(val => !isNaN(val) && val >= 0 && val <= 100, "Percentual de comissão deve ser entre 0 e 100.")
  ),
  status: z.enum(['Ativo', 'Inativo', 'Férias'], {
    errorMap: () => ({ message: "Status é obrigatório." })
  }),
  avatar_file: z.any()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= 5000000, `Tamanho máximo da imagem é 5MB.`)
    .refine((files) => !files || files.length === 0 || ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type), `Apenas .jpg, .png e .webp são aceitos.`)
    .optional(),
});

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

interface RoleType {
  id: number;
  description: string;
}

const CollaboratorFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { collaboratorId } = useParams<{ collaboratorId: string }>(); // Get collaboratorId from URL
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [loading, setLoading] = useState(false);
  const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
  const [loadingRoleTypes, setLoadingRoleTypes] = useState(true);
  const [currentCollaboratorData, setCurrentCollaboratorData] = useState<any>(null); // State to hold fetched data for editing
  const isEditing = !!collaboratorId;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      hire_date: '',
      role_type_id: undefined, // Initialize as undefined for Select
      commission_percentage: '0.00' as any,
      status: 'Ativo',
      avatar_file: undefined,
    },
  });

  const phoneNumberValue = watch('phone_number');
  const roleTypeIdValue = watch('role_type_id');
  const statusValue = watch('status');
  const commissionPercentageValue = watch('commission_percentage');

  const fetchRoleTypes = useCallback(async () => {
    setLoadingRoleTypes(true);
    const { data, error } = await supabase
      .from('role_types')
      .select('id, description')
      .order('description', { ascending: true });

    if (error) {
      showError('Erro ao carregar tipos de função: ' + error.message);
      console.error('Error fetching role types:', error);
    } else if (data) {
      setRoleTypes(data);
    }
    setLoadingRoleTypes(false);
  }, []);

  const fetchCollaborator = useCallback(async () => {
    if (collaboratorId && primaryCompanyId) {
      setLoading(true);
      const { data, error } = await supabase
        .from('collaborators')
        .select('first_name, last_name, email, phone_number, hire_date, role_type_id, commission_percentage, status, avatar_url')
        .eq('id', collaboratorId)
        .eq('company_id', primaryCompanyId)
        .single();

      if (error) {
        showError('Erro ao carregar colaborador: ' + error.message);
        console.error('Error fetching collaborator:', error);
        navigate('/colaboradores');
      } else if (data) {
        setCurrentCollaboratorData(data); // Store fetched data
        reset({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone_number: formatPhoneNumberInput(data.phone_number || ''),
          hire_date: data.hire_date || '',
          role_type_id: data.role_type_id?.toString(), // Convert number to string here
          commission_percentage: data.commission_percentage?.toFixed(2).replace('.', ',') as any,
          status: data.status as 'Ativo' | 'Inativo' | 'Férias',
          // avatar_file is not pre-filled for security/complexity reasons, user can re-upload
        });
      }
      setLoading(false);
    }
  }, [collaboratorId, primaryCompanyId, reset, navigate]);

  useEffect(() => {
    fetchRoleTypes();
  }, [fetchRoleTypes]);

  useEffect(() => {
    if (!session && !loadingPrimaryCompany) {
      showError('Você precisa estar logado para gerenciar colaboradores.');
      navigate('/login');
    }
    if (!primaryCompanyId && !loadingPrimaryCompany && session) {
      showError('Você precisa ter uma empresa primária cadastrada para gerenciar colaboradores.');
      navigate('/register-company');
    }
    if (isEditing) {
      fetchCollaborator();
    }
  }, [session, primaryCompanyId, loadingPrimaryCompany, navigate, isEditing, fetchCollaborator]);

  const formatPhoneNumberInput = (value: string) => {
    if (!value) return '';
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);

    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    } else if (cleaned.length <= 7) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
    } else if (cleaned.length <= 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    return cleaned;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumberInput(e.target.value);
    setValue('phone_number', formattedValue, { shouldValidate: true });
  };

  const onSubmit = async (data: CollaboratorFormValues) => {
    setLoading(true);
    if (!session?.user || !primaryCompanyId) {
      showError('Erro de autenticação ou empresa primária não encontrada.');
      setLoading(false);
      return;
    }

    let avatarUrl: string | null = null;
    if (data.avatar_file && data.avatar_file.length > 0) {
      const file = data.avatar_file[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${primaryCompanyId}-${data.email}-${Date.now()}.${fileExt}`;
      const filePath = `collaborator_avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('collaborator_avatars')
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
        .from('collaborator_avatars')
        .getPublicUrl(filePath);
      
      avatarUrl = publicUrlData.publicUrl;
    }

    try {
      let error;
      if (isEditing) {
        // Update existing collaborator
        const updateData: any = {
          first_name: data.first_name,
          last_name: data.last_name,
          // email: data.email, // Email should not be editable after creation
          phone_number: data.phone_number.replace(/\D/g, ''),
          hire_date: data.hire_date,
          role_type_id: data.role_type_id,
          commission_percentage: data.commission_percentage,
          status: data.status,
        };
        if (avatarUrl) { // Only update avatar_url if a new file was uploaded
          updateData.avatar_url = avatarUrl;
        } else if (data.avatar_file && data.avatar_file.length === 0 && currentCollaboratorData?.avatar_url) {
          // If user explicitly cleared the file input and there was an existing avatar, set it to null
          updateData.avatar_url = null;
        }

        const { error: updateError } = await supabase
          .from('collaborators')
          .update(updateData)
          .eq('id', collaboratorId)
          .eq('company_id', primaryCompanyId);
        error = updateError;
      } else {
        // Call Edge Function to invite and register new collaborator
        const response = await supabase.functions.invoke('invite-collaborator', {
          body: JSON.stringify({
            companyId: primaryCompanyId,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            phoneNumber: data.phone_number.replace(/\D/g, ''),
            hireDate: data.hire_date,
            roleTypeId: data.role_type_id,
            commissionPercentage: data.commission_percentage,
            status: data.status,
            avatarUrl: avatarUrl, // Pass the uploaded avatar URL
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.error) {
          throw response.error;
        }
      }

      if (error) { // This `error` variable is only for the `isEditing` path
        throw error;
      }

      showSuccess('Colaborador ' + (isEditing ? 'atualizado' : 'cadastrado') + ' com sucesso!');
      reset();
      navigate('/colaboradores');
    } catch (error: any) {
      console.error('Erro ao salvar colaborador:', error);
      showError('Erro ao salvar colaborador: ' + (error.message || 'Erro desconhecido.'));
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || loadingPrimaryCompany || loadingRoleTypes || (isEditing && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando informações do colaborador...</p>
      </div>
    );
  }

  const pageTitle = isEditing ? 'Editar Colaborador' : 'Adicionar Novo Colaborador';
  const buttonText = isEditing ? 'Salvar Alterações' : 'Salvar Colaborador';

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
        <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
      </div>
      <div className="max-w-2xl">
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="Nome do colaborador"
                    {...register('first_name')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-sm font-medium text-gray-700 mb-2">
                    Sobrenome *
                  </Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Sobrenome do colaborador"
                    {...register('last_name')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2">
                  E-mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@colaborador.com"
                  {...register('email')}
                  className="mt-1 border-gray-300 text-sm"
                  disabled={isEditing} // Email should not be editable after creation
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone_number" className="text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  value={phoneNumberValue}
                  onChange={handlePhoneNumberChange}
                  maxLength={15}
                  className="mt-1 border-gray-300 text-sm"
                />
                {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hire_date" className="text-sm font-medium text-gray-700 mb-2">
                    Data de Contratação *
                  </Label>
                  <Input
                    id="hire_date"
                    type="date"
                    {...register('hire_date')}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.hire_date && <p className="text-red-500 text-xs mt-1">{errors.hire_date.message}</p>}
                </div>
                <div>
                  <Label htmlFor="role_type_id" className="text-sm font-medium text-gray-700 mb-2">
                    Função *
                  </Label>
                  <Select onValueChange={(value) => setValue('role_type_id', Number(value), { shouldValidate: true })} value={roleTypeIdValue?.toString()}>
                    <SelectTrigger id="role_type_id" className="mt-1 border-gray-300 text-sm" disabled={loadingRoleTypes}>
                      <SelectValue placeholder={loadingRoleTypes ? "Carregando funções..." : "Selecione a função"} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleTypes.length === 0 && !loadingRoleTypes ? (
                        <SelectItem value="no-roles" disabled>Nenhuma função disponível.</SelectItem>
                      ) : (
                        roleTypes.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.description}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.role_type_id && <p className="text-red-500 text-xs mt-1">{errors.role_type_id.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commission_percentage" className="text-sm font-medium text-gray-700 mb-2">
                    Percentual de Comissão (%) *
                  </Label>
                  <Input
                    id="commission_percentage"
                    type="text"
                    placeholder="0.00"
                    value={commissionPercentageValue}
                    onChange={(e) => setValue('commission_percentage', e.target.value, { shouldValidate: true })}
                    className="mt-1 border-gray-300 text-sm"
                  />
                  {errors.commission_percentage && <p className="text-red-500 text-xs mt-1">{errors.commission_percentage.message}</p>}
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </Label>
                  <Select onValueChange={(value) => setValue('status', value as 'Ativo' | 'Inativo' | 'Férias', { shouldValidate: true })} value={statusValue}>
                    <SelectTrigger id="status" className="mt-1 border-gray-300 text-sm">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Férias">Férias</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="avatar_file" className="text-sm font-medium text-gray-700 mb-2">
                  Foto do Colaborador (opcional)
                </Label>
                <Input
                  id="avatar_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  {...register('avatar_file')}
                  className="mt-2 file:text-sm file:font-semibold file:bg-yellow-600 file:text-black file:border-none file:rounded-button file:px-4 file:py-2 file:mr-4 hover:file:bg-yellow-700 dark:file:bg-yellow-700 dark:file:text-black dark:text-gray-300 dark:border-gray-600"
                />
                {errors.avatar_file && <p className="text-red-500 text-xs mt-1">{errors.avatar_file.message}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Apenas .jpg, .png, .webp. Máximo 5MB.</p>
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
                  className="w-full !rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black font-semibold py-2.5 text-base flex-1"
                  disabled={loading || sessionLoading || loadingPrimaryCompany || loadingRoleTypes}
                >
                  {loading || sessionLoading || loadingPrimaryCompany || loadingRoleTypes ? 'Carregando...' : buttonText}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CollaboratorFormPage;