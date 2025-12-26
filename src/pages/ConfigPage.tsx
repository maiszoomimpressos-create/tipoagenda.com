import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Loader2, Copy } from "lucide-react";
import { toast } from 'sonner';

const ConfigPage: React.FC = () => {
  const { settings, loading, isSaving, updateSettings } = useCompanySettings();
  const { primaryCompanyId } = usePrimaryCompany();
  const [requireClientRegistration, setRequireClientRegistration] = useState(false);
  const [guestAppointmentLink, setGuestAppointmentLink] = useState("");

  useEffect(() => {
    if (settings) {
      setRequireClientRegistration(settings.require_client_registration);
      setGuestAppointmentLink(settings.guest_appointment_link || "");
    }
  }, [settings]);

  useEffect(() => {
    if (primaryCompanyId) {
      const baseUrl = window.location.origin;
      const generatedLink = `${baseUrl}/guest-appointment/${primaryCompanyId}`;
      if (guestAppointmentLink === "" || (settings && settings.guest_appointment_link !== generatedLink)) {
          setGuestAppointmentLink(generatedLink);
      }
    }
  }, [primaryCompanyId, settings, guestAppointmentLink]);

  const handleSave = async () => {
    await updateSettings({
      require_client_registration: requireClientRegistration,
      guest_appointment_link: guestAppointmentLink,
    });
  };

  const handleCopyLink = () => {
    if (guestAppointmentLink) {
      navigator.clipboard.writeText(guestAppointmentLink);
      toast.success("Link copiado para a área de transferência!");
    } else {
      toast.error("Nenhum link para copiar.");
    }
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

      <div className="space-y-4">
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
      </div>
    </div>
  );
};

export default ConfigPage;





