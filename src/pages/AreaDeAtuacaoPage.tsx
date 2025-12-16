import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Edit, Trash2, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Zod schema for area de atuacao
const areaDeAtuacaoSchema = z.object({
  name: z.string().min(1, "O nome da área de atuação é obrigatório."),
  segment_type_id: z.string().min(1, "O segmento é obrigatório."),
});

type AreaDeAtuacaoFormValues = z.infer<typeof areaDeAtuacaoSchema>;

interface SegmentType {
  id: string;
  name: string;
}

interface AreaDeAtuacao {
  id: string;
  name: string;
  segment_type_id: string;
  segment_types: { name: string };
  created_at: string;
}

const AreaDeAtuacaoPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const [areas, setAreas] = useState<AreaDeAtuacao[]>([]);
  const [segments, setSegments] = useState<SegmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSegments, setLoadingSegments] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaDeAtuacao | null>(null);
  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AreaDeAtuacaoFormValues>({
    resolver: zodResolver(areaDeAtuacaoSchema),
    defaultValues: {
      name: '',
      segment_type_id: '',
    },
  });

  const segmentTypeIdValue = watch('segment_type_id');

  const fetchSegments = useCallback(async () => {
    setLoadingSegments(true);
    // Fetch all segments (Global access)
    const { data, error } = await supabase
      .from('segment_types')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      showError('Erro ao carregar tipos de segmento: ' + error.message);
      console.error('Error fetching segment types:', error);
    } else if (data) {
      setSegments(data);
    }
    setLoadingSegments(false);
  }, []);

  const fetchAreas = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('area_de_atuacao')
      .select(`
        id, 
        name, 
        segment_type_id, 
        created_at,
        segment_types(name)
      `)
      .order('name', { ascending: true });

    if (error) {
      showError('Erro ao carregar áreas de atuação: ' + error.message);
      console.error('Error fetching areas:', error);
    } else if (data) {
      setAreas(data as AreaDeAtuacao[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchSegments();
    fetchAreas();
  }, [fetchSegments, fetchAreas]);

  const handleAddArea = () => {
    setEditingArea(null);
    reset({ name: '', segment_type_id: '' });
    setIsFormModalOpen(true);
  };

  const handleEditArea = (area: AreaDeAtuacao) => {
    setEditingArea(area);
    reset({ name: area.name, segment_type_id: area.segment_type_id });
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (areaId: string) => {
    setAreaToDelete(areaId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (areaToDelete && session?.user) {
      setLoading(true);
      const { error } = await supabase
        .from('area_de_atuacao')
        .delete()
        .eq('id', areaToDelete); // RLS garante que apenas o admin global pode deletar

      if (error) {
        showError('Erro ao excluir área de atuação: ' + error.message);
        console.error('Error deleting area:', error);
      } else {
        showSuccess('Área de atuação excluída com sucesso!');
        fetchAreas();
      }
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setAreaToDelete(null);
    }
  };

  const onSubmit = async (data: AreaDeAtuacaoFormValues) => {
    setLoading(true);
    if (!session?.user) {
      showError('Você precisa estar logado para gerenciar áreas de atuação.');
      setLoading(false);
      return;
    }

    let error;
    const payload = {
      name: data.name,
      segment_type_id: data.segment_type_id,
      user_id: session.user.id,
    };

    if (editingArea) {
      // Update existing area
      const { error: updateError } = await supabase
        .from('area_de_atuacao')
        .update(payload)
        .eq('id', editingArea.id);
      error = updateError;
    } else {
      // Insert new area
      const { error: insertError } = await supabase
        .from('area_de_atuacao')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      showError('Erro ao ' + (editingArea ? 'atualizar' : 'cadastrar') + ' área de atuação: ' + error.message);
      console.error('Error saving area:', error);
    } else {
      showSuccess('Área de atuação ' + (editingArea ? 'atualizada' : 'cadastrada') + ' com sucesso!');
      fetchAreas();
      setIsFormModalOpen(false);
    }
    setLoading(false);
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Você precisa estar logado para gerenciar áreas de atuação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          className="!rounded-button cursor-pointer"
          onClick={() => navigate('/admin-dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Áreas de Atuação</h1>
      </div>

      <div className="max-w-4xl space-y-6">
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-900">Áreas de Atuação por Segmento</CardTitle>
            <Button
              className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
              onClick={handleAddArea}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Nova Área
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-gray-700">Carregando áreas de atuação...</p>
            ) : areas.length === 0 ? (
              <p className="text-gray-600">Nenhuma área de atuação cadastrada ainda.</p>
            ) : (
              <div className="space-y-3">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-blue-600" />
                        <div>
                            <span className="font-medium text-gray-900">{area.name}</span>
                            <p className="text-xs text-gray-600">Segmento: {area.segment_types?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="!rounded-button whitespace-nowrap"
                        onClick={() => handleEditArea(area)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="!rounded-button whitespace-nowrap"
                        onClick={() => handleDeleteClick(area.id)}
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

      {/* Form Modal for Add/Edit Area */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Editar Área de Atuação' : 'Nova Área de Atuação'}</DialogTitle>
            <DialogDescription>
              {editingArea ? 'Altere os detalhes da área.' : 'Adicione uma nova área de atuação e associe-a a um segmento.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="segment_type_id" className="text-right">
                Segmento *
              </Label>
              <Select onValueChange={(value) => setValue('segment_type_id', value, { shouldValidate: true })} value={segmentTypeIdValue}>
                <SelectTrigger id="segment_type_id" className="col-span-3" disabled={loadingSegments}>
                  <SelectValue placeholder={loadingSegments ? "Carregando segmentos..." : "Selecione o segmento"} />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.segment_type_id && <p className="col-span-4 text-red-500 text-xs text-right">{errors.segment_type_id.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome *
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
              Tem certeza que deseja excluir esta área de atuação? Esta ação não pode ser desfeita.
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

export default AreaDeAtuacaoPage;