/**
 * Página: Gerenciamento de Banners (Painel Admin)
 * 
 * Esta página demonstra como implementar a lógica de negócio
 * que limita a inserção a 1 banner por empresa no painel admin.
 * 
 * Funcionalidades:
 * - Lista todos os banners
 * - Permite criar/editar banner (com validação de 1 por empresa)
 * - Permite excluir banner
 * - Mostra status e informações da empresa
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { BannerFormModal } from '@/components/BannerFormModal';
import { getAllBanners, getGlobalBanners, deleteBanner, type Banner } from '@/services/bannerService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BannerWithCompany extends Banner {
  companies?: { // companies agora é opcional
    name: string;
  };
}

const BannerManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]); // Usar diretamente Banner
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null); // Estado para banner sendo editado
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);

  /**
   * Carrega todos os banners com informações das empresas
   */
  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGlobalBanners(); // Buscar apenas banners globais
      setBanners(data);
    } catch (error: any) {
      console.error('Erro ao carregar banners globais:', error);
      showError('Erro ao carregar banners globais: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  /**
   * Abre modal para criar novo banner global
   */
  const handleCreateBanner = () => {
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  /**
   * Abre modal para editar banner global existente
   */
  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  /**
   * Confirma exclusão de banner
   */
  const handleDeleteBanner = async () => {
    if (!bannerToDelete) return;

    try {
      await deleteBanner(bannerToDelete);
      showSuccess('Banner excluído com sucesso!');
      fetchBanners();
    } catch (error: any) {
      console.error('Erro ao excluir banner:', error);
      showError('Erro ao excluir banner: ' + error.message);
    } finally {
      setBannerToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Carregando banners...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Banners Globais</h1>
            <p className="text-muted-foreground">
              Gerencie os banners globais do sistema. Máximo de 20 banners globais.
            </p>
          </div>
        </div>
        <Button onClick={handleCreateBanner}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Banner
        </Button>
      </div>

      {/* Lista de banners */}
      <div className="grid gap-4">
        {banners.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum banner cadastrado ainda.
            </CardContent>
          </Card>
        ) : (
          banners.map((banner) => (
            <Card key={banner.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      {banner.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tipo: Global
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={banner.is_active ? 'default' : 'secondary'}>
                      {banner.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditBanner(banner)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setBannerToDelete(banner.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {banner.description && (
                  <p className="text-sm mb-2">{banner.description}</p>
                )}
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>URL da Imagem: {banner.image_url}</p>
                  {banner.link_url && (
                    <p>Link de Destino: {banner.link_url}</p>
                  )}
                  <p>Ordem: {banner.display_order}</p>
                  <p>
                    Criado em:{' '}
                    {new Date(banner.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de formulário */}
      {isModalOpen && (
        <BannerFormModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBanner(null); // Limpa o banner em edição ao fechar
          }}
          isGlobal={true}
          companyId={editingBanner?.company_id || undefined} // Passa companyId se estiver editando
          onSuccess={fetchBanners}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog
        open={!!bannerToDelete}
        onOpenChange={(open) => !open && setBannerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este banner? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBanner} className="bg-red-500">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BannerManagementPage;

