import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContractAcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: {
    id: string;
    contract_name: string;
    contract_content: string;
  } | null;
  onAccept: () => void;
  loading: boolean;
}

const ContractAcceptanceModal: React.FC<ContractAcceptanceModalProps> = ({
  isOpen,
  onClose,
  contract,
  onAccept,
  loading,
}) => {
  const [accepted, setAccepted] = useState(false);

  if (!contract) {
    return null; // Or render a loading/error state
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Termos e Condições: {contract.contract_name}</DialogTitle>
          <DialogDescription>
            Por favor, leia o contrato abaixo e aceite os termos para continuar com o cadastro da sua empresa.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4 border rounded-md my-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {contract.contract_content}
            </p>
          </div>
        </ScrollArea>
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id="terms"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(!!checked)}
          />
          <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Eu li e aceito os termos do contrato.
          </Label>
        </div>
        <DialogFooter className="flex justify-between items-center mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="!rounded-button whitespace-nowrap"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            disabled={!accepted || loading}
            className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          >
            {loading ? 'Cadastrando...' : 'Aceitar e Cadastrar Empresa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractAcceptanceModal;