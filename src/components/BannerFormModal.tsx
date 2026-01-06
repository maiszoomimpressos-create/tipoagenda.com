/**
 * Componente: Modal de Formulário de Banner
 * 
 * Este componente implementa a lógica de negócio para garantir
 * que apenas 1 banner seja criado por empresa. Ele:
 * 1. Verifica se já existe banner antes de permitir criação
 * 2. Oferece opção de atualizar banner existente
 * 3. Valida os dados antes de submeter
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  createBanner, 
  updateBanner, 
  getBannerByCompanyId, 
  checkCompanyHasBanner,
  type Banner 
} from '@/services/bannerService';
import { showSuccess, showError } from '@/utils/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Schema de validação
const bannerSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  description: z.string().optional(),
  image_file: z.any()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= 5000000, 'Tamanho máximo da imagem é 5MB.')
    .refine((files) => !files || files.length === 0 || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(files?.[0]?.type), 'Apenas .jpg, .png, .webp e .gif são aceitos.')
    .optional(),
  image_url: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  link_url: z.string().url('URL de destino inválida').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  display_order: z.number().int().min(0).default(0),
}).refine((data) => data.image_file?.length > 0 || (data.image_url && data.image_url.length > 0), {
  message: 'É necessário fazer upload de uma imagem ou fornecer uma URL.',
  path: ['image_file'],
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface BannerFormModalProps {
  open: boolean;
  onClose: () => void;
  companyId?: string; // Tornar opcional para banners globais
  companyName?: string;
  isGlobal?: boolean; // Nova prop para indicar se é um banner global
  onSuccess?: () => void;
}

export const BannerFormModal: React.FC<BannerFormModalProps> = ({
  open,
  onClose,
  companyId,
  companyName,
  isGlobal = false, // Default para false
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingBanner, setExistingBanner] = useState<Banner | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      is_active: true,
      display_order: 0,
    },
  });

  const isActive = watch('is_active');

  // Verificar se já existe banner ao abrir o modal
  useEffect(() => {
    if (open && companyId) {
      checkExistingBanner();
    } else {
      // Resetar estado ao fechar
      setExistingBanner(null);
      setIsEditMode(false);
      setImagePreview(null);
      setUploadMethod('upload');
      reset();
    }
  }, [open, companyId, isGlobal]);

  /**
   * Verifica se já existe banner (para empresa ou global)
   */
  const checkExistingBanner = async () => {
    if (!isGlobal && !companyId) return; // Se não é global e não tem companyId, não faz nada

    try {
      let banner: Banner | null = null;
      if (isGlobal) {
        // Para banners globais, precisamos listar todos e verificar se algum existe para preencher
        const globalBanners = await getAllBanners(undefined); // Buscar banners globais
        if (globalBanners.length > 0) {
          banner = globalBanners[0]; // Pegar o primeiro para edição, se houver
        }
      } else if (companyId) {
        banner = await getBannerByCompanyId(companyId);
      }
      
      if (banner) {
        setExistingBanner(banner);
        setIsEditMode(true);
        setValue('title', banner.title);
        setValue('description', banner.description || '');
        setValue('image_url', banner.image_url);
        setValue('link_url', banner.link_url || '');
        setValue('is_active', banner.is_active);
        setValue('display_order', banner.display_order);
        setImagePreview(banner.image_url);
        setUploadMethod('url');
      } else {
        setExistingBanner(null);
        setIsEditMode(false);
        reset();
        setImagePreview(null);
        setUploadMethod('upload');
      }
    } catch (error: any) {
      console.error('Erro ao verificar banner existente:', error);
      showError('Erro ao verificar banner existente: ' + error.message);
    }
  };

  /**
   * Faz upload da imagem para o Supabase Storage
   */
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}-${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('banners')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error('Erro ao fazer upload da imagem: ' + uploadError.message);
    }

    // Obter URL pública da imagem
    const { data: publicUrlData } = supabase.storage
      .from('banners')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  /**
   * Handler para mudança de arquivo de imagem
   */
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho
      if (file.size > 5000000) {
        showError('Tamanho máximo da imagem é 5MB.');
        // Limpar o input para permitir selecionar o mesmo arquivo novamente
        if (e.target) e.target.value = ''; 
        return;
      }
      // Validar tipo
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        showError('Apenas .jpg, .png, .webp e .gif são aceitos.');
        // Limpar o input para permitir selecionar o mesmo arquivo novamente
        if (e.target) e.target.value = '';
        return;
      }
      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue('image_file', [file]);
      setValue('image_url', '');
    }
    // Limpar o valor do input se nenhum arquivo foi selecionado ou se o arquivo é inválido, 
    // para que o onChange seja disparado novamente se o mesmo arquivo for selecionado.
    // Note: Isso só é necessário se o arquivo for o mesmo E ele for válido. 
    // Para simplificar, faremos isso sempre que nenhum arquivo válido for processado.
    if (!file && e.target) e.target.value = '';
  };

  /**
   * Handler para mudança de URL de imagem
   */
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setValue('image_url', url);
    if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
    setValue('image_file', undefined);
  };

  /**
   * Submete o formulário
   * Implementa a lógica: se já existe, atualiza; se não, cria
   */
  const onSubmit = async (data: BannerFormValues) => {
    setLoading(true);
    setUploading(true);

    try {
      let finalImageUrl = data.image_url || '';

      // Se houver arquivo para upload, fazer upload primeiro
      if (data.image_file && data.image_file.length > 0) {
        try {
          finalImageUrl = await uploadImage(data.image_file[0]);
        } catch (uploadError: any) {
          showError(uploadError.message);
          setLoading(false);
          setUploading(false);
          return;
        }
      }

      // Validar que temos uma URL de imagem
      if (!finalImageUrl) {
        showError('É necessário fornecer uma imagem (upload ou URL).');
        setLoading(false);
        setUploading(false);
        return;
      }

      if (isEditMode && existingBanner) {
        // Atualizar banner existente
        await updateBanner(existingBanner.id, {
          title: data.title,
          description: data.description || undefined,
          image_url: finalImageUrl,
          link_url: data.link_url || undefined,
          is_active: data.is_active,
          display_order: data.display_order,
        });
        showSuccess('Banner atualizado com sucesso!');
      } else {
        // Criar novo banner
        await createBanner({
          // Se for banner global, company_id é null
          company_id: isGlobal ? null : companyId,
          title: data.title,
          description: data.description || undefined,
          image_url: finalImageUrl,
          link_url: data.link_url || undefined,
          is_active: data.is_active,
          display_order: data.display_order,
        });
        showSuccess('Banner criado com sucesso!');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar banner:', error);
      showError(error.message || 'Erro ao salvar banner');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Banner' : 'Criar Banner'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Atualize as informações do banner.'
              : isGlobal
                ? 'Crie um novo banner global. Um máximo de 20 banners globais são permitidos.'
                : 'Crie um novo banner para a empresa. Cada empresa pode ter apenas 1 banner.'}
          </DialogDescription>
        </DialogHeader>

        {/* Alerta informando sobre banner existente */}
        {isEditMode && existingBanner && !isGlobal && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta empresa já possui um banner cadastrado. Você está editando o banner existente.
              {companyName && ` (${companyName})`}
            </AlertDescription>
          </Alert>
        )}

        {isEditMode && existingBanner && isGlobal && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este é um banner global existente. Você está editando-o.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ex: Promoção de Verão"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descrição opcional do banner"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Campo de Imagem */}
          <div className="space-y-2">
            <Label>Imagem do Banner *</Label>
            <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'upload' | 'url')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Fazer Upload</TabsTrigger>
                <TabsTrigger value="url">Usar URL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      id="image_file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      ref={fileInputRef} // Adicionar ref
                      onChange={handleImageFileChange}
                      className="hidden" // Ocultar input nativo
                      disabled={loading || uploading}
                    />
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()} // Acionar clique no input oculto
                      disabled={loading || uploading}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos aceitos: JPG, PNG, WEBP, GIF (máx. 5MB)
                    </p>
                  </div>
                </div>
                {errors.image_file && (
                  <p className="text-sm text-red-500">{errors.image_file.message as string}</p>
                )}
              </TabsContent>
              
              <TabsContent value="url" className="space-y-2">
                <Input
                  id="image_url"
                  type="url"
                  {...register('image_url')}
                  onChange={handleImageUrlChange}
                  placeholder="https://exemplo.com/imagem.jpg"
                  disabled={loading || uploading}
                />
                {errors.image_url && (
                  <p className="text-sm text-red-500">{errors.image_url.message}</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Preview da Imagem */}
            {imagePreview && (
              <div className="mt-4 space-y-2">
                <Label>Preview da Imagem</Label>
                <div className="relative w-full max-w-md border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview do banner"
                    className="w-full h-auto max-h-64 object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                    onClick={() => {
                      setImagePreview(null);
                      setValue('image_file', undefined);
                      setValue('image_url', '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_url">URL de Destino (opcional)</Label>
            <Input
              id="link_url"
              type="url"
              {...register('link_url')}
              placeholder="https://exemplo.com/promocao"
            />
            {errors.link_url && (
              <p className="text-sm text-red-500">{errors.link_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Ordem de Exibição</Label>
            <Input
              id="display_order"
              type="number"
              min="0"
              {...register('display_order', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Menor número = maior prioridade (padrão: 0)
            </p>
            {errors.display_order && (
              <p className="text-sm text-red-500">{errors.display_order.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <Label htmlFor="is_active">Banner ativo</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || uploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Fazendo upload...
                </>
              ) : loading ? (
                'Salvando...'
              ) : isEditMode ? (
                'Atualizar'
              ) : (
                'Criar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

