import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface AppointmentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | null;
  currentStatus: string;
  onStatusUpdated: () => void;
}

const AppointmentStatusModal: React.FC<AppointmentStatusModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  currentStatus,
  onStatusUpdated,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus]);

  const handleSave = async () => {
    if (!appointmentId) {
      showError('ID do agendamento não fornecido.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: selectedStatus })
        .eq('id', appointmentId);

      if (error) {
        throw error;
      }

      showSuccess('Status do agendamento atualizado com sucesso!');
      onStatusUpdated();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar status do agendamento:', error);
      showError('Erro ao atualizar status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Status do Agendamento</DialogTitle>
          <DialogDescription>
            Selecione o novo status para este agendamento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select onValueChange={setSelectedStatus} value={selectedStatus}>
              <SelectTrigger id="status" className="col-span-3">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center">
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
            onClick={handleSave}
            disabled={loading}
            className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          >
            {loading ? 'Gravando...' : 'Gravar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentStatusModal;