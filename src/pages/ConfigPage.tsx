import React, { useState, useEffect, useCallback } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Loader2, Copy, Image as ImageIcon, Edit, Trash2 } from "lucide-react";
import { toast } from 'sonner';
import { BannerFormModal } from '@/components/BannerFormModal';
import { getBannerByCompanyId, deleteBanner, type Banner } from '@/services/bannerService';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Separator } from "@/components/ui/separator";
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

const ConfigPage: React.FC = () => {
  const { settings, loading, isSaving, updateSettings } = useCompanySettings();
  const { primaryCompanyId } = usePrimaryCompany();
  const [requireClientRegistration, setRequireClientRegistration] = useState(false);
  const [guestAppointmentLink, setGuestAppointmentLink] = useState("");
  
  // Estados para gerenciamento de banner
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setRequireClientRegistration(settings.require_client_registration);
      setGuestAppointmentLink(settings.guest_appointment_link || "");
    }
  }, [settings]);

  // Função para buscar banner atual
  const fetchCurrentBanner = useCallback(async () => {
    if (!primaryCompanyId) return;
    
    setBannerLoading(true);
    try {
      const banner = await getBannerByCompanyId(primaryCompanyId);
      setCurrentBanner(banner);
    } catch (error: any) {
      console.error('Erro ao buscar banner:', error);
      // Não mostrar erro se simplesmente não houver banner
      if (error.message && !error.message.includes('PGRST116')) {
        showError('Erro ao carregar banner: ' + error.message);
      }
    } finally {
      setBannerLoading(false);
    }
  }, [primaryCompanyId]);

  useEffect(() => {
    if (primaryCompanyId) {
      const baseUrl = window.location.origin;
      const generatedLink = `${baseUrl}/guest-appointment/${primaryCompanyId}`;
      if (guestAppointmentLink === "" || (settings && settings.guest_appointment_link !== generatedLink)) {
          setGuestAppointmentLink(generatedLink);
      }
      
      // Buscar nome da empresa
      supabase
        .from('companies')
        .select('name')
        .eq('id', primaryCompanyId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setCompanyName(data.name);
          }
        });
      
      // Buscar banner atual
      fetchCurrentBanner();
    }
  }, [primaryCompanyId, settings, guestAppointmentLink, fetchCurrentBanner]);

  // Função para excluir banner
  const handleDeleteBanner = async () => {
    if (!bannerToDelete) return;

    try {
      await deleteBanner(bannerToDelete);
      showSuccess('Banner excluído com sucesso!');
      setCurrentBanner(null);
      setBannerToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir banner:', error);
      showError('Erro ao excluir banner: ' + error.message);
    }
  };

  const handleSave = async () => {
    await updateSettings({
      require_client_registration: requireClientRegistration,
      guest_appointment_link: guestAppointmentLink,
    });
  };

  const handleCopyLink = () => {
    if (guestAppointmentLink) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        console.log('Attempting to copy link using navigator.clipboard:', guestAppointmentLink);
        navigator.clipboard.writeText(guestAppointmentLink)
          .then(() => {
            toast.success("Link copiado para a área de transferência!");
          })
          .catch(err => {
            console.error('Failed to copy link using navigator.clipboard, falling back:', err);
            fallbackCopyTextToClipboard(guestAppointmentLink);
          });
      } else {
        console.log('navigator.clipboard not available, falling back:', guestAppointmentLink);
        fallbackCopyTextToClipboard(guestAppointmentLink);
      }
    } else {
      toast.error("Nenhum link para copiar.");
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  // Evita que a rolagem aconteça
    textArea.style.left = "-9999px";
    textArea.style.top = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      toast.success("Link copiado para a área de transferência! (Fallback)");
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      toast.error("Falha ao copiar o link usando fallback.");
    }
    document.body.removeChild(textArea);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
        <p className="ml-2 text-gray-600">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Configurações da Empresa</h1>

      <div className="space-y-6">
        {/* Seção de Banner */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Banner da Empresa
                </CardTitle>
                <CardDescription className="mt-1">
                  Gerencie o banner da sua empresa. Cada empresa pode ter apenas 1 banner.
                </CardDescription>
              </div>
              {primaryCompanyId && (
                <Button
                  onClick={() => setIsBannerModalOpen(true)}
                  variant={currentBanner ? "outline" : "default"}
                >
                  {currentBanner ? (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Banner
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Criar Banner
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {bannerLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
                <p className="ml-2 text-gray-600">Carregando banner...</p>
              </div>
            ) : currentBanner ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{currentBanner.title}</h3>
                    {currentBanner.description && (
                      <p className="text-sm text-gray-600 mb-3">{currentBanner.description}</p>
                    )}
                    <div className="space-y-1 text-sm text-gray-500">
                      <p><strong>URL da Imagem:</strong> {currentBanner.image_url}</p>
                      {currentBanner.link_url && (
                        <p><strong>Link de Destino:</strong> {currentBanner.link_url}</p>
                      )}
                      <p><strong>Status:</strong> {currentBanner.is_active ? 'Ativo' : 'Inativo'}</p>
                      <p><strong>Ordem:</strong> {currentBanner.display_order}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsBannerModalOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setBannerToDelete(currentBanner.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="mb-4">Nenhum banner cadastrado ainda.</p>
                {primaryCompanyId && (
                  <Button
                    onClick={() => setIsBannerModalOpen(true)}
                    variant="outline"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Criar Primeiro Banner
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Seção de Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
            <CardDescription>
              Configure as opções gerais da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Checkbox para require_client_registration */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requireClientRegistration"
                checked={requireClientRegistration}
                onCheckedChange={(checked) => setRequireClientRegistration(checked as boolean)}
                disabled={isSaving}
              />
              <Label htmlFor="requireClientRegistration" className="text-base">
                Exigir registro de cliente antes do agendamento
              </Label>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Se esta opção estiver ativada, os clientes precisarão ter um cadastro na sua empresa antes de poderem realizar um agendamento. Isso garante que você tenha as informações básicas do cliente desde o primeiro contato.
            </p>

            {/* Campo de texto para o link de agendamento para convidados */}
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="guestAppointmentLink">Link de Agendamento para Convidados</Label>
              <div className="flex space-x-2">
                <Input
                  type="url"
                  id="guestAppointmentLink"
                  placeholder="Link será gerado automaticamente"
                  value={guestAppointmentLink}
                  onChange={(e) => setGuestAppointmentLink(e.target.value)}
                  disabled={isSaving || !primaryCompanyId}
                />
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={isSaving || !guestAppointmentLink}
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500">Este link pode ser compartilhado com clientes para agendamentos sem necessidade de cadastro. Será preenchido automaticamente com o código da sua empresa.</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-yellow-600 hover:bg-yellow-700 text-black !rounded-button"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Formulário de Banner */}
      {primaryCompanyId && (
        <BannerFormModal
          open={isBannerModalOpen}
          onClose={() => {
            setIsBannerModalOpen(false);
          }}
          companyId={primaryCompanyId}
          companyName={companyName}
          onSuccess={() => {
            fetchCurrentBanner();
          }}
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

export default ConfigPage;







