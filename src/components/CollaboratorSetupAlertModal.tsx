import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Clock, Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CollaboratorSetupAlertModalProps {
  open: boolean;
  onClose: () => void;
  collaboratorId: string;
  collaboratorName: string;
  onGoToSchedule: () => void;
  onGoToServices: () => void;
  onDontShowAgain?: (dontShow: boolean) => void;
}

/**
 * Modal informativo sobre a importância de configurar horários e serviços do colaborador
 * Exibido após o cadastro do primeiro colaborador
 */
export const CollaboratorSetupAlertModal: React.FC<CollaboratorSetupAlertModalProps> = ({
  open,
  onClose,
  collaboratorId,
  collaboratorName,
  onGoToSchedule,
  onGoToServices,
  onDontShowAgain,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (onDontShowAgain) {
      onDontShowAgain(dontShowAgain);
    }
    onClose();
  };

  const handleGoToSchedule = () => {
    if (onDontShowAgain) {
      onDontShowAgain(dontShowAgain);
    }
    onGoToSchedule();
  };

  const handleGoToServices = () => {
    if (onDontShowAgain) {
      onDontShowAgain(dontShowAgain);
    }
    onGoToServices();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl">Colaborador Cadastrado com Sucesso!</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Agora é importante configurar as informações essenciais para <strong>{collaboratorName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Por que isso é importante?</strong>
            <br />
            Sem essas configurações, o colaborador não poderá receber agendamentos e não aparecerá nas opções disponíveis para os clientes.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-2">
          {/* Configuração de Horários */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Configurar Horários de Trabalho
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Defina os dias da semana e horários em que o colaborador está disponível para atender. 
                Isso permite que o sistema mostre apenas os horários disponíveis quando os clientes forem agendar.
              </p>
              <Button
                onClick={handleGoToSchedule}
                size="sm"
                className="!rounded-button bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Clock className="h-4 w-4 mr-2" />
                Configurar Horários
              </Button>
            </div>
          </div>

          {/* Configuração de Serviços */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Relacionar Serviços do Colaborador
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <strong>EXTREMAMENTE IMPORTANTE:</strong> Relacione quais serviços este colaborador realiza. 
                Sem essa configuração, o colaborador não aparecerá como opção quando os clientes forem agendar esses serviços.
                Você também pode configurar comissões específicas para cada serviço.
              </p>
              <Button
                onClick={handleGoToServices}
                size="sm"
                className="!rounded-button bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Relacionar Serviços
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="dont-show-again"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <Label
            htmlFor="dont-show-again"
            className="text-sm font-normal cursor-pointer"
          >
            Não mostrar este aviso novamente
          </Label>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="!rounded-button w-full sm:w-auto"
          >
            Entendi, depois
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

