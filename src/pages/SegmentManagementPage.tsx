import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Zod schema for segment type
const segmentTypeSchema = z.object({
  name: z.string().min(1, "O nome do segmento é obrigatório."),
});

type SegmentTypeFormValues = z.infer<typeof segmentTypeSchema>;

interface SegmentType {
  id: string;
  name: string;
  created_at: string;
}

const SegmentManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [segments, setSegments] = useState<SegmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<SegmentType | null>(null);
  const [segmentToDelete, setSegmentToDelete] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SegmentTypeFormValues>({
    resolver: zodResolver(segmentTypeSchema),
    defaultValues: {
      name: '',
    },
  });

  const fetchSegments = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('segment_types')
      .select('id, name, created_at')
      .eq('user_id', session.user.id)
      .order('name', { ascending: true });

    if (error) {
      showError('Erro ao carregar segmentos: ' + error.message);
      console.error('Error fetching segments:', error);
    } else if (data) {
      setSegments(data);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleAddSegment = () => {
    setEditingSegment(null);
    reset({ name: '' });
    setIsFormModalOpen(true);
  };

  const handleEditSegment = (segment: SegmentType) => {
    setEditingSegment(segment);
    reset({ name: segment.name });
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (segmentId: string) => {
    setSegmentToDelete(segmentId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (segmentToDelete && session?.user) {
      setLoading(true);
      const { error } = await supabase
        .from('segment_types')
        .delete()
        .eq('id', segmentToDelete)
        .eq('user_id', session.user.id);

      if (error) {
        showError('Erro ao excluir segmento: ' + error.message);
        console.error('Error deleting segment:', error);
      } else {
        showSuccess('Segmento excluído com sucesso!');
        fetchSegments();
      }
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setSegmentToDelete(null);
    }
  };

  const onSubmit = async (data: SegmentTypeFormValues) => {
    setLoading(true);
    if (!session?.user) {
      showError('Você precisa estar logado para gerenciar segmentos.');
      setLoading(false);
      return;
    }

    let error;
    if (editingSegment) {
      // Update existing segment
      const { error: updateError } = await supabase
        .from('segment_types')
        .update({ name: data.name })
        .eq('id', editingSegment.id)
        .eq('user_id', session.user.id);
      error = updateError;
    } else {
      // Insert new segment
      const { error: insertError } = await supabase
        .from('segment_types')
        .insert({ user_id: session.user.id, name: data.name });
      error = insertError;
    }

    if (error) {
      showError('Erro ao ' + (editingSegment ? 'atualizar' : 'cadastrar') + ' segmento: ' + error.message);
      console.error('Error saving segment:', error);
    } else {
      showSuccess('Segmento ' + (editingSegment ? 'atualizado' : 'cadastrado') + ' com sucesso!');
      fetchSegments();
      setIsFormModalOpen(false);
    }
    setLoading(false);
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para gerenciar segmentos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate('/admin-dashboard')} // Navigate back to admin dashboard
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Segmentos de Empresa</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-900">Meus Segmentos</CardTitle>
            <Button
              className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
              onClick={handleAddSegment}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo Segmento
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-gray-700">Carregando segmentos...</p>
            ) : segments.length === 0 ? (
              <p className="text-gray-600">Nenhum segmento cadastrado ainda. Clique em "Novo Segmento" para começar.</p>
            ) : (
              <div className="space-y-3">
                {segments.map((segment) => (
                  <div key={segment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{segment.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="!rounded-button whitespace-nowrap"
                        onClick={() => handleEditSegment(segment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="!rounded-button whitespace-nowrap"
                        onClick={() => handleDeleteClick(segment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Modal for Add/Edit Segment */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingSegment ? 'Editar Segmento' : 'Novo Segmento'}</DialogTitle>
            <DialogDescription>
              {editingSegment ? 'Altere o nome do segmento.' : 'Adicione um novo tipo de segmento para suas empresas.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                {...register('name')}
                className="col-span-3"
              />
              {errors.name && <p className="col-span-4 text-red-500 text-xs text-right">{errors.name.message}</p>}
            </div>
            <DialogFooter className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                className="!rounded-button whitespace-nowrap"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black">
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este segmento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SegmentManagementPage;