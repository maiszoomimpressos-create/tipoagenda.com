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
import { Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PermissionsAlertModalProps {
  open: boolean;
  onClose: () => void;
  onGoToPermissions: () => void;
  title?: string;
  message?: string;
  onDontShowAgain?: (dontShow: boolean) => void;
}

/**
 * Modal informativo sobre a importância de configurar permissões de menu
 * Exibido na primeira vez que o usuário realiza certas ações
 */
export const PermissionsAlertModal: React.FC<PermissionsAlertModalProps> = ({
  open,
  onClose,
  onGoToPermissions,
  title = 'Configuração Importante',
  message = 'É importante configurar as permissões de menu para definir quais funções (roles) têm acesso a quais menus na sua empresa.',
  onDontShowAgain,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (onDontShowAgain) {
      onDontShowAgain(dontShowAgain);
    }
    onClose();
  };

  const handleGoToPermissions = () => {
    if (onDontShowAgain) {
      onDontShowAgain(dontShowAgain);
    }
    onGoToPermissions();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Por que isso é importante?</strong>
            <br />
            Ao configurar as permissões de menu, você garante que cada colaborador tenha acesso apenas aos recursos necessários para sua função, melhorando a segurança e organização da sua empresa.
          </AlertDescription>
        </Alert>

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
          <Button
            onClick={handleGoToPermissions}
            className="!rounded-button bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            <Shield className="h-4 w-4 mr-2" />
            Ir para Permissões de Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

