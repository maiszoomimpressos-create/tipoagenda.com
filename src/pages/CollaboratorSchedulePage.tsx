import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Zod schema for a single working schedule entry
const workingScheduleSchema = z.object({
  id: z.string().optional(),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)."),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)."),
});

// Zod schema for a single schedule exception entry
const scheduleExceptionSchema = z.object({
  id: z.string().optional(),
  exception_date: z.string().min(1, "Data da exceção é obrigatória."),
  is_day_off: z.boolean().default(false),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM).").optional().or(z.literal('')),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM).").optional().or(z.literal('')),
  reason: z.string().optional(),
});

// Main form schema
const collaboratorScheduleFormSchema = z.object({
  working_schedules: z.array(workingScheduleSchema),
  schedule_exceptions: z.array(scheduleExceptionSchema),
});

type CollaboratorScheduleFormValues = z.infer<typeof collaboratorScheduleFormSchema>;

interface Collaborator {
  id: string;
  first_name: string;
  last_name: string;
}

const daysOfWeek = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const CollaboratorSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { collaboratorId } = useParams<{ collaboratorId: string }>();
  const { session, loading: sessionLoading } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [loading, setLoading] = useState(true);
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [editingException, setEditingException] = useState<scheduleExceptionSchema | null>(null);
  const [isDeleteExceptionDialogOpen, setIsDeleteExceptionDialogOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CollaboratorScheduleFormValues>({
    resolver: zodResolver(collaboratorScheduleFormSchema),
    defaultValues: {
      working_schedules: [],
      schedule_exceptions: [],
    },
  });

  const { fields: workingScheduleFields, append: appendWorkingSchedule, remove: removeWorkingSchedule } = useFieldArray({
    control,
    name: "working_schedules",
  });

  const { fields: exceptionFields, append: appendException, remove: removeException, update: updateException } = useFieldArray({
    control,
    name: "schedule_exceptions",
  });

  const watchExceptionIsDayOff = watch('schedule_exceptions');

  const fetchCollaboratorAndSchedules = useCallback(async () => {
    if (sessionLoading || loadingPrimaryCompany || !collaboratorId || !primaryCompanyId) {
      return;
    }

    setLoading(true);
    try {
      // Fetch collaborator details
      const { data: collabData, error: collabError } = await supabase
        .from('collaborators')
        .select('first_name, last_name')
        .eq('id', collaboratorId)
        .eq('company_id', primaryCompanyId)
        .single();

      if (collabError || !collabData) {
        showError('Erro ao carregar dados do colaborador: ' + (collabError?.message || 'Colaborador não encontrado.'));
        navigate('/colaboradores');
        return;
      }
      setCollaborator({ id: collaboratorId, ...collabData });

      // Fetch working schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('working_schedules')
        .select('id, day_of_week, start_time, end_time')
        .eq('collaborator_id', collaboratorId)
        .order('day_of_week', { ascending: true });

      if (schedulesError) {
        showError('Erro ao carregar horários de trabalho: ' + schedulesError.message);
        console.error('Error fetching working schedules:', schedulesError);
      }

      // Fetch schedule exceptions
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('schedule_exceptions')
        .select('id, exception_date, is_day_off, start_time, end_time, reason')
        .eq('collaborator_id', collaboratorId)
        .order('exception_date', { ascending: true });

      if (exceptionsError) {
        showError('Erro ao carregar exceções de horário: ' + exceptionsError.message);
        console.error('Error fetching schedule exceptions:', exceptionsError);
      }

      reset({
        working_schedules: schedulesData || [],
        schedule_exceptions: exceptionsData?.map(ex => ({
          ...ex,
          exception_date: ex.exception_date, // Keep as string for form
        })) || [],
      });

    } catch (error: any) {
      console.error('Erro ao carregar dados da página:', error);
      showError('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [sessionLoading, loadingPrimaryCompany, collaboratorId, primaryCompanyId, navigate, reset]);

  useEffect(() => {
    fetchCollaboratorAndSchedules();
  }, [fetchCollaboratorAndSchedules]);

  const onSubmit = async (data: CollaboratorScheduleFormValues) => {
    setLoading(true);
    if (!session?.user || !primaryCompanyId || !collaboratorId) {
      showError('Erro de autenticação ou dados da empresa/colaborador faltando.');
      setLoading(false);
      return;
    }

    try {
      // --- Update/Insert/Delete Working Schedules ---
      const existingScheduleIds = workingScheduleFields.map(f => f.id).filter(Boolean);
      const schedulesToKeep = data.working_schedules.filter(s => s.id);
      const schedulesToInsert = data.working_schedules.filter(s => !s.id);

      // Delete removed schedules
      const { error: deleteSchedulesError } = await supabase
        .from('working_schedules')
        .delete()
        .eq('collaborator_id', collaboratorId)
        .eq('company_id', primaryCompanyId)
        .not('id', 'in', `(${schedulesToKeep.map(s => `'${s.id}'`).join(',') || 'NULL'})`); // Handle empty array

      if (deleteSchedulesError) throw deleteSchedulesError;

      // Update existing schedules
      for (const schedule of schedulesToKeep) {
        const { error: updateScheduleError } = await supabase
          .from('working_schedules')
          .update({
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          })
          .eq('id', schedule.id!)
          .eq('collaborator_id', collaboratorId)
          .eq('company_id', primaryCompanyId);
        if (updateScheduleError) throw updateScheduleError;
      }

      // Insert new schedules
      if (schedulesToInsert.length > 0) {
        const { error: insertSchedulesError } = await supabase
          .from('working_schedules')
          .insert(schedulesToInsert.map(s => ({
            ...s,
            collaborator_id: collaboratorId,
            company_id: primaryCompanyId,
          })));
        if (insertSchedulesError) throw insertSchedulesError;
      }

      // --- Update/Insert/Delete Schedule Exceptions ---
      const existingExceptionIds = exceptionFields.map(f => f.id).filter(Boolean);
      const exceptionsToKeep = data.schedule_exceptions.filter(e => e.id);
      const exceptionsToInsert = data.schedule_exceptions.filter(e => !e.id);

      // Delete removed exceptions
      const { error: deleteExceptionsError } = await supabase
        .from('schedule_exceptions')
        .delete()
        .eq('collaborator_id', collaboratorId)
        .eq('company_id', primaryCompanyId)
        .not('id', 'in', `(${exceptionsToKeep.map(e => `'${e.id}'`).join(',') || 'NULL'})`); // Handle empty array

      if (deleteExceptionsError) throw deleteExceptionsError;

      // Update existing exceptions
      for (const exception of exceptionsToKeep) {
        const { error: updateExceptionError } = await supabase
          .from('schedule_exceptions')
          .update({
            exception_date: exception.exception_date,
            is_day_off: exception.is_day_off,
            start_time: exception.is_day_off ? null : exception.start_time,
            end_time: exception.is_day_off ? null : exception.end_time,
            reason: exception.reason,
          })
          .eq('id', exception.id!)
          .eq('collaborator_id', collaboratorId)
          .eq('company_id', primaryCompanyId);
        if (updateExceptionError) throw updateExceptionError;
      }

      // Insert new exceptions
      if (exceptionsToInsert.length > 0) {
        const { error: insertExceptionsError } = await supabase
          .from('schedule_exceptions')
          .insert(exceptionsToInsert.map(e => ({
            ...e,
            collaborator_id: collaboratorId,
            company_id: primaryCompanyId,
            start_time: e.is_day_off ? null : e.start_time,
            end_time: e.is_day_off ? null : e.end_time,
          })));
        if (insertExceptionsError) throw insertExceptionsError;
      }

      showSuccess('Horários e exceções do colaborador salvos com sucesso!');
      fetchCollaboratorAndSchedules(); // Re-fetch to ensure UI is updated with new IDs
    } catch (error: any) {
      console.error('Erro ao salvar horários:', error);
      showError('Erro ao salvar horários: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddException = () => {
    setEditingException(null);
    setSelectedDate(undefined);
    setIsExceptionModalOpen(true);
  };

  const handleEditException = (exception: scheduleExceptionSchema, index: number) => {
    setEditingException({ ...exception, indexInForm: index }); // Store index for update
    setSelectedDate(parseISO(exception.exception_date));
    setIsExceptionModalOpen(true);
  };

  const handleSaveException = (formData: any) => {
    const newException: scheduleExceptionSchema = {
      exception_date: format(selectedDate!, 'yyyy-MM-dd'),
      is_day_off: formData.is_day_off,
      start_time: formData.is_day_off ? '' : formData.start_time,
      end_time: formData.is_day_off ? '' : formData.end_time,
      reason: formData.reason,
    };

    if (editingException && editingException.id) {
      // Update existing exception in form array
      const index = exceptionFields.findIndex(f => f.id === editingException.id);
      if (index !== -1) {
        updateException(index, { ...exceptionFields[index], ...newException });
      }
    } else {
      // Append new exception
      appendException(newException);
    }
    setIsExceptionModalOpen(false);
    setEditingException(null);
  };

  const handleDeleteExceptionClick = (exceptionId: string) => {
    setExceptionToDelete(exceptionId);
    setIsDeleteExceptionDialogOpen(true);
  };

  const confirmDeleteException = () => {
    if (exceptionToDelete) {
      const index = exceptionFields.findIndex(f => f.id === exceptionToDelete);
      if (index !== -1) {
        removeException(index);
        showSuccess('Exceção removida do formulário. Salve para aplicar as mudanças.');
      }
    }
    setIsDeleteExceptionDialogOpen(false);
    setExceptionToDelete(null);
  };

  if (sessionLoading || loadingPrimaryCompany || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando horários do colaborador...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para gerenciar horários.</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para gerenciar horários.
        </p>
        <Button
          className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
          onClick={() => navigate('/register-company')}
        >
          <i className="fas fa-building mr-2"></i>
          Cadastrar Empresa
        </Button>
      </div>
    );
  }

  if (!collaborator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Colaborador não encontrado.</p>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900">
          Horários de {collaborator.first_name} {collaborator.last_name}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Horário de Trabalho Semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {daysOfWeek.map((day, index) => {
              const fieldIndex = workingScheduleFields.findIndex(f => f.day_of_week === day.value);
              const isWorking = fieldIndex !== -1;

              return (
                <div key={day.value} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-32 font-medium text-gray-900">{day.label}</div>
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={isWorking}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        appendWorkingSchedule({
                          day_of_week: day.value,
                          start_time: '09:00',
                          end_time: '18:00',
                        });
                      } else {
                        if (fieldIndex !== -1) {
                          removeWorkingSchedule(fieldIndex);
                        }
                      }
                    }}
                  />
                  <Label htmlFor={`day-${day.value}`} className="flex-1">Trabalha neste dia</Label>

                  {isWorking && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        {...register(`working_schedules.${fieldIndex}.start_time`)}
                        className="w-28 text-sm border-gray-300"
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        {...register(`working_schedules.${fieldIndex}.end_time`)}
                        className="w-28 text-sm border-gray-300"
                      />
                      {errors.working_schedules?.[fieldIndex]?.start_time && <p className="text-red-500 text-xs">{errors.working_schedules[fieldIndex]?.start_time?.message}</p>}
                      {errors.working_schedules?.[fieldIndex]?.end_time && <p className="text-red-500 text-xs">{errors.working_schedules[fieldIndex]?.end_time?.message}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-900">Exceções de Horário</CardTitle>
            <Button
              type="button"
              className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
              onClick={handleAddException}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Adicionar Exceção
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {exceptionFields.length === 0 ? (
              <p className="text-gray-600">Nenhuma exceção de horário cadastrada.</p>
            ) : (
              exceptionFields.map((exception, index) => (
                <div key={exception.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(parseISO(exception.exception_date), 'dd/MM/yyyy', { locale: ptBR })}
                      {exception.is_day_off ? ' (Dia de Folga)' : ` (${exception.start_time} - ${exception.end_time})`}
                    </p>
                    {exception.reason && <p className="text-sm text-gray-600">{exception.reason}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="!rounded-button whitespace-nowrap"
                      onClick={() => handleEditException(exception, index)}
                    >
                      <ArrowLeft className="h-4 w-4" /> {/* Reusing ArrowLeft for edit, consider a proper edit icon */}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="!rounded-button whitespace-nowrap"
                      onClick={() => handleDeleteExceptionClick(exception.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

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
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Horários'}
          </Button>
        </div>
      </form>

      {/* Modal para Adicionar/Editar Exceção */}
      <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingException ? 'Editar Exceção' : 'Adicionar Exceção'}</DialogTitle>
            <DialogDescription>
              Defina um dia de folga ou um horário especial para o colaborador.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleSaveException)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="exception_date" className="text-right">
                Data
              </Label>
              <div className="col-span-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={ptBR}
                />
                {!selectedDate && <p className="text-red-500 text-xs mt-1">Selecione uma data.</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="is_day_off" className="text-right">
                Dia de Folga
              </Label>
              <Checkbox
                id="is_day_off"
                checked={watchExceptionIsDayOff.some(e => e.id === editingException?.id ? e.is_day_off : false)} // Check if current exception is day off
                onCheckedChange={(checked) => {
                  if (editingException) {
                    const index = exceptionFields.findIndex(f => f.id === editingException.id);
                    if (index !== -1) {
                      setValue(`schedule_exceptions.${index}.is_day_off`, !!checked);
                    }
                  } else {
                    // For new exception, set a temporary value or handle in handleSaveException
                    // For simplicity, we'll handle it in handleSaveException
                  }
                }}
                className="col-span-3"
              />
            </div>
            {!watchExceptionIsDayOff.some(e => e.id === editingException?.id ? e.is_day_off : false) && ( // Only show if not a full day off
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start_time" className="text-right">
                    Início
                  </Label>
                  <Input
                    id="start_time"
                    type="time"
                    {...register('schedule_exceptions.0.start_time')} // Use a dummy index for register, actual value set by setValue
                    className="col-span-3"
                    defaultValue={editingException?.start_time || '09:00'}
                  />
                  {errors.schedule_exceptions?.[0]?.start_time && <p className="col-span-4 text-red-500 text-xs text-right">{errors.schedule_exceptions[0]?.start_time?.message}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="end_time" className="text-right">
                    Fim
                  </Label>
                  <Input
                    id="end_time"
                    type="time"
                    {...register('schedule_exceptions.0.end_time')} // Use a dummy index for register, actual value set by setValue
                    className="col-span-3"
                    defaultValue={editingException?.end_time || '18:00'}
                  />
                  {errors.schedule_exceptions?.[0]?.end_time && <p className="col-span-4 text-red-500 text-xs text-right">{errors.schedule_exceptions[0]?.end_time?.message}</p>}
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Motivo
              </Label>
              <Input
                id="reason"
                type="text"
                {...register('schedule_exceptions.0.reason')} // Use a dummy index for register
                className="col-span-3"
                defaultValue={editingException?.reason || ''}
              />
            </div>
            <DialogFooter className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExceptionModalOpen(false)}
                className="!rounded-button whitespace-nowrap"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!selectedDate || loading} className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black">
                {loading ? 'Salvando...' : 'Salvar Exceção'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Exception Confirmation Dialog */}
      <Dialog open={isDeleteExceptionDialogOpen} onOpenChange={setIsDeleteExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta exceção de horário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteExceptionDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteException} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollaboratorSchedulePage;