import React, { useState, useEffect, useCallback } from 'react';
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
import { validateCnpj, formatCnpjInput, formatZipCodeInput } from '@/utils/validation';
import ContractAcceptanceModal from '@/components/ContractAcceptanceModal';

// Zod schema for company registration
const companySchema = z.object({
  name: z.string().min(1, "Nome fantasia é obrigatório."),
  razao_social: z.string().min(1, "Razão social é obrigatória."),
  cnpj: z.string()
    .min(1, "CNPJ é obrigatório.")
    .refine((val) => {
      const cleanedCnpj = val.replace(/[^\d]+/g, '');
      return validateCnpj(cleanedCnpj);
    }, "CNPJ inválido."),
  ie: z.string().optional(),
  company_email: z.string().email("E-mail da empresa inválido.").min(1, "E-mail da empresa é obrigatório."),
  phone_number: z.string()
    .min(1, "Número de telefone é obrigatório.")
    .regex(/^\(\d{2}\)\s\d{5}-\d{4}$/, "Formato de telefone inválido (ex: (XX) XXXXX-XXXX)"),
  segment_type: z.string().min(1, "Segmento é obrigatório."),
  address: z.string().min(1, "Endereço é obrigatório."),
  number: z.string().min(1, "Número é obrigatório."),
  neighborhood: z.string().min(1, "Bairro é obrigatório."),
  complement: z.string().optional(),
  zip_code: z.string()
    .min(1, "CEP é obrigatório.")
    .regex(/^\d{5}-\d{3}$/, "Formato de CEP inválido (ex: XXXXX-XXX)"),
  city: z.string().min(1, "Cidade é obrigatória."),
  state: z.string().min(1, "Estado é obrigatório."),
  company_logo: z.any()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= 5000000, `Tamanho máximo da imagem é 5MB.`)
    .refine((files) => !files || files.length === 0 || ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type), `Apenas .jpg, .png e .webp são aceitos.`)
    .optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const CompanyRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [proprietarioRoleId, setProprietarioRoleId] = useState<number | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [latestContract, setLatestContract] = useState<{ id: string; contract_name: string; contract_content: string } | null>(null);
  const [pendingCompanyData, setPendingCompanyData] = useState<CompanyFormValues | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [segmentOptions, setSegmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(true);
  // isAddressFieldsDisabled will no longer disable fields, but can still be used for internal logic if needed
  const [isAddressFieldsDisabled, setIsAddressFieldsDisabled] = useState(false);


  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      razao_social: '',
      cnpj: '',
      ie: '',
      company_email: '',
      phone_number: '',
      segment_type: '',
      address: '',
      number: '',
      neighborhood: '',
      complement: '',
      zip_code: '',
      city: '',
      state: '',
    },
  });

  const segmentTypeValue = watch('segment_type');
  const cnpjValue = watch('cnpj');
  const zipCodeValue = watch('zip_code');
  const phoneNumberValue = watch('phone_number');
  const stateValue = watch('state'); // Watch state value for potential city filtering (future)

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!session?.user) {
        setLoadingSegments(false);
        return;
      }

      // Fetch Proprietário role ID
      const { data: roleData, error: roleError } = await supabase
        .from('role_types')
        .select('id')
        .eq('description', 'Proprietário')
        .single();

      if (roleError) {
        console.error('Error fetching Proprietário role ID:', roleError);
        showError('Erro ao carregar ID do papel de Proprietário.');
      } else if (roleData) {
        setProprietarioRoleId(roleData.id);
      }

      // Fetch the latest contract
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('id, contract_name, contract_content')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (contractError && contractError.code !== 'PGRST116') {
        console.error('Error fetching latest contract:', contractError);
        showError('Erro ao carregar o contrato mais recente.');
      } else if (contractData) {
        setLatestContract(contractData);
      }

      // Fetch segment types from the database (GLOBAL ACCESS)
      setLoadingSegments(true);
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('segment_types')
        .select('id, name')
        // Removed .eq('user_id', session.user.id) to allow global visibility
        .order('name', { ascending: true });

      if (segmentsError) {
        showError('Erro ao carregar tipos de segmento: ' + segmentsError.message);
        console.error('Error fetching segment types:', segmentsError);
      } else if (segmentsData) {
        setSegmentOptions(segmentsData.map(segment => ({ value: segment.id, label: segment.name })));
      }
      setLoadingSegments(false);
    };
    fetchInitialData();
  }, [session]);

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

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCnpjInput(e.target.value);
    setValue('cnpj', formattedValue, { shouldValidate: true });
  };

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatZipCodeInput(rawValue);
    setValue('zip_code', formattedValue, { shouldValidate: true });

    const cleanedCep = rawValue.replace(/\D/g, '');

    if (cleanedCep.length === 8) {
      setLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();

        if (data.erro) {
          showError('CEP não encontrado.');
          clearAddressFields();
          setIsAddressFieldsDisabled(false); // Keep fields enabled for manual input
          setError('zip_code', { type: 'manual', message: 'CEP não encontrado.' });
        } else {
          setValue('address', data.logradouro || '');
          setValue('neighborhood', data.bairro || '');
          setValue('city', data.localidade || '');
          setValue('state', data.uf || '');
          clearErrors(['address', 'neighborhood', 'city', 'state', 'zip_code']);
          setIsAddressFieldsDisabled(false); // Keep fields enabled for manual input
          showSuccess('Endereço preenchido automaticamente!');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        showError('Erro ao buscar CEP. Tente novamente.');
        clearAddressFields();
        setIsAddressFieldsDisabled(false); // Keep fields enabled for manual input
      } finally {
        setLoading(false);
      }
    } else if (cleanedCep.length < 8) {
      // If CEP is incomplete, re-enable fields and clear errors
      setIsAddressFieldsDisabled(false);
      clearErrors('zip_code');
    }
  };

  const clearAddressFields = () => {
    setValue('address', '');
    setValue('neighborhood', '');
    setValue('city', '');
    setValue('state', '');
  };

  const handleFormSubmit = async (data: CompanyFormValues) => {
    setLoading(true);
    if (!session?.user) {
      showError('Você precisa estar logado para registrar uma empresa.');
      setLoading(false);
      return;
    }

    if (!latestContract) {
      showError('Nenhum contrato disponível para aceite. Por favor, contate o suporte.');
      setLoading(false);
      return;
    }

    let imageUrl: string | null = null;

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
    
    setPendingCompanyData(data);
    setPendingImageUrl(imageUrl);
    setIsContractModalOpen(true);
    setLoading(false);
  };

  const handleAcceptAndRegister = async () => {
    setLoading(true);
    if (!session?.user || !pendingCompanyData || !latestContract || proprietarioRoleId === null) {
      showError('Erro interno: dados incompletos para o cadastro da empresa.');
      setLoading(false);
      return;
    }

    const cleanedCnpj = pendingCompanyData.cnpj.replace(/\D/g, '');
    const cleanedZipCode = pendingCompanyData.zip_code.replace(/\D/g, '');
    const cleanedPhoneNumber = pendingCompanyData.phone_number.replace(/\D/g, '');

    const { data: companyData, error: insertError } = await supabase
      .from('companies')
      .insert({
        name: pendingCompanyData.name,
        razao_social: pendingCompanyData.razao_social,
        cnpj: cleanedCnpj,
        ie: pendingCompanyData.ie,
        company_email: pendingCompanyData.company_email,
        phone_number: cleanedPhoneNumber,
        segment_type: pendingCompanyData.segment_type, // Now stores segment_type ID
        address: pendingCompanyData.address,
        number: pendingCompanyData.number,
        neighborhood: pendingCompanyData.neighborhood,
        complement: pendingCompanyData.complement,
        zip_code: cleanedZipCode,
        city: pendingCompanyData.city,
        state: pendingCompanyData.state,
        user_id: session.user.id,
        image_url: pendingImageUrl,
        contract_accepted: true,
        accepted_contract_id: latestContract.id,
      })
      .select()
      .single();

    if (insertError) {
      showError('Erro ao cadastrar empresa: ' + insertError.message);
      setLoading(false);
      return;
    }

    if (companyData) {
      const { error: assignRoleError } = await supabase.rpc('assign_user_to_company', {
        p_user_id: session.user.id,
        p_company_id: companyData.id,
        p_role_type_id: proprietarioRoleId
      });

      if (assignRoleError) {
        showError('Erro ao atribuir papel de proprietário à empresa: ' + assignRoleError.message);
        setLoading(false);
        return;
      }

      const { error: setPrimaryError } = await supabase.rpc('set_primary_company_role', {
        p_user_id: session.user.id,
        p_company_id: companyData.id,
        p_role_type_id: proprietarioRoleId
      });

      if (setPrimaryError) {
        showError('Erro ao definir empresa como primária: ' + setPrimaryError.message);
        setLoading(false);
        return;
      }
    }

    showSuccess('Empresa cadastrada com sucesso e você foi definido como proprietário!');
    setIsContractModalOpen(false);
    setPendingCompanyData(null);
    setPendingImageUrl(null);
    navigate('/dashboard');
    setLoading(false);
  };

  const statesOptions = [
    { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' }, { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' }, { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' }, { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' }, { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' }, { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' }, { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' }, { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' }, { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' }, { value: 'TO', label: 'Tocantins' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8">
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
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="razao_social" className="text-sm font-medium text-gray-700 dark:text-gray-300">Razão Social *</Label>
                <Input
                  id="razao_social"
                  type="text"
                  placeholder="Razão Social da empresa"
                  {...register('razao_social')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.razao_social && <p className="text-red-500 text-xs mt-1">{errors.razao_social.message}</p>}
              </div>
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome Fantasia *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nome fantasia da empresa"
                  {...register('name')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cnpj" className="text-sm font-medium text-gray-700 dark:text-gray-300">CNPJ *</Label>
                <Input
                  id="cnpj"
                  type="text"
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  value={cnpjValue}
                  onChange={handleCnpjChange}
                  maxLength={18}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.cnpj && <p className="text-red-500 text-xs mt-1">{errors.cnpj.message}</p>}
              </div>
              <div>
                <Label htmlFor="ie" className="text-sm font-medium text-gray-700 dark:text-gray-300">Inscrição Estadual (IE)</Label>
                <Input
                  id="ie"
                  type="text"
                  placeholder="Opcional"
                  {...register('ie')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.ie && <p className="text-red-500 text-xs mt-1">{errors.ie.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_email" className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mail da Empresa *</Label>
                <Input
                  id="company_email"
                  type="email"
                  placeholder="contato@suaempresa.com"
                  {...register('company_email')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.company_email && <p className="text-red-500 text-xs mt-1">{errors.company_email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone_number" className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefone *</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  value={phoneNumberValue}
                  onChange={handlePhoneNumberChange}
                  maxLength={15}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="segment_type" className="text-sm font-medium text-gray-700 dark:text-gray-300">Segmento *</Label>
              <Select onValueChange={(value) => setValue('segment_type', value, { shouldValidate: true })} value={segmentTypeValue}>
                <SelectTrigger id="segment_type" className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500" disabled={loadingSegments}>
                  <SelectValue placeholder={loadingSegments ? "Carregando segmentos..." : "Selecione o segmento da empresa"} />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-white">
                  {segmentOptions.length === 0 && !loadingSegments ? (
                    <SelectItem value="no-segments" disabled>Nenhum segmento disponível. Crie um nas configurações.</SelectItem>
                  ) : (
                    segmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.segment_type && <p className="text-red-500 text-xs mt-1">{errors.segment_type.message}</p>}
            </div>

            {/* Reordered Address Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado *</Label>
                <Select onValueChange={(value) => setValue('state', value, { shouldValidate: true })} value={stateValue}>
                  <SelectTrigger id="state" className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-700 dark:text-white">
                    {statesOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
              </div>
              <div>
                <Label htmlFor="zip_code" className="text-sm font-medium text-gray-700 dark:text-gray-300">CEP *</Label>
                <Input
                  id="zip_code"
                  type="text"
                  placeholder="XXXXX-XXX"
                  value={zipCodeValue}
                  onChange={handleZipCodeChange}
                  maxLength={9}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.zip_code && <p className="text-red-500 text-xs mt-1">{errors.zip_code.message}</p>}
              </div>
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">Cidade *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Sua cidade"
                  {...register('city')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">Endereço *</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Rua, Avenida, etc."
                  {...register('address')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
              </div>
              <div>
                <Label htmlFor="number" className="text-sm font-medium text-gray-700 dark:text-gray-300">Número *</Label>
                <Input
                  id="number"
                  type="text"
                  placeholder="123"
                  {...register('number')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="neighborhood" className="text-sm font-medium text-gray-700 dark:text-gray-300">Bairro *</Label>
                <Input
                  id="neighborhood"
                  type="text"
                  placeholder="Seu bairro"
                  {...register('neighborhood')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.neighborhood && <p className="text-red-500 text-xs mt-1">{errors.neighborhood.message}</p>}
              </div>
              <div>
                <Label htmlFor="complement" className="text-sm font-medium text-gray-700 dark:text-gray-300">Complemento (opcional)</Label>
                <Input
                  id="complement"
                  type="text"
                  placeholder="Apto, Sala, Bloco"
                  {...register('complement')}
                  className="mt-2 h-10 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
                {errors.complement && <p className="text-red-500 text-xs mt-1">{errors.complement.message}</p>}
              </div>
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
              disabled={loading || loadingSegments}
            >
              {loading || loadingSegments ? 'Carregando...' : 'Cadastrar Empresa'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {latestContract && (
        <ContractAcceptanceModal
          isOpen={isContractModalOpen}
          onClose={() => {
            setIsContractModalOpen(false);
            setPendingCompanyData(null);
            setPendingImageUrl(null);
            setLoading(false);
          }}
          contract={latestContract}
          onAccept={handleAcceptAndRegister}
          loading={loading}
        />
      )}
    </div>
  );
};

export default CompanyRegistrationPage;