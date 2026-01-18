import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface Feature {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface PlanFeature {
  plan_id: string;
  feature_id: string;
  feature_limit: number | null;
  features: Feature; // Relação para obter detalhes da funcionalidade
}

const PlanFeaturesManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [planName, setPlanName] = useState('');

  // Estado para o modal de adicionar/editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanFeature, setEditingPlanFeature] = useState<PlanFeature | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');
  const [featureLimit, setFeatureLimit] = useState<number | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState<PlanFeature | null>(null);

  const fetchPlanDetails = useCallback(async () => {
    if (!planId) return;
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', planId)
        .single();
      if (error) throw error;
      setPlanName(data.name);
    } catch (error: any) {
      console.error('Erro ao carregar detalhes do plano:', error);
      showError('Erro ao carregar detalhes do plano.');
      navigate('/admin-dashboard/plans'); // Volta se não encontrar o plano
    }
  }, [planId, navigate]);

  const fetchPlanFeatures = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plan_features')
        .select(`
          feature_limit,
          features (*)
        `)
        .eq('plan_id', planId);

      if (error) throw error;
      setPlanFeatures(data as PlanFeature[]);
    } catch (error: any) {
      console.error('Erro ao carregar funcionalidades do plano:', error);
      showError('Erro ao carregar funcionalidades do plano.');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  const fetchAvailableFeatures = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('is_active', true); // Apenas funcionalidades ativas
      if (error) throw error;
      setAvailableFeatures(data as Feature[]);
    } catch (error: any) {
      console.error('Erro ao carregar funcionalidades disponíveis:', error);
      showError('Erro ao carregar funcionalidades disponíveis.');
    }
  }, []);

  useEffect(() => {
    if (planId) {
      fetchPlanDetails();
      fetchPlanFeatures();
      fetchAvailableFeatures();
    }
  }, [planId, fetchPlanDetails, fetchPlanFeatures, fetchAvailableFeatures]);

  const handleAddFeatureClick = () => {
    setEditingPlanFeature(null);
    setSelectedFeatureId('');
    setFeatureLimit(null);
    setIsModalOpen(true);
  };

  const handleEditFeatureClick = (planFeature: PlanFeature) => {
    setEditingPlanFeature(planFeature);
    setSelectedFeatureId(planFeature.feature_id);
    setFeatureLimit(planFeature.feature_limit);
    setIsModalOpen(true);
  };

  const handleSavePlanFeature = async () => {
    if (!planId || !selectedFeatureId) {
      showError('Selecione uma funcionalidade.');
      return;
    }

    setLoading(true);
    try {
      if (editingPlanFeature) {
        // Editar funcionalidade existente
        const { error } = await supabase
          .from('plan_features')
          .update({ feature_limit: featureLimit })
          .eq('plan_id', planId)
          .eq('feature_id', editingPlanFeature.feature_id);

        if (error) throw error;
        showSuccess('Funcionalidade do plano atualizada com sucesso!');
      } else {
        // Adicionar nova funcionalidade
        const { error } = await supabase
          .from('plan_features')
          .insert({
            plan_id: planId,
            feature_id: selectedFeatureId,
            feature_limit: featureLimit,
          });

        if (error) throw error;
        showSuccess('Funcionalidade adicionada ao plano com sucesso!');
      }
      setIsModalOpen(false);
      fetchPlanFeatures(); // Recarrega a lista
    } catch (error: any) {
      console.error('Erro ao salvar funcionalidade do plano:', error);
      showError('Erro ao salvar funcionalidade do plano: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = (planFeature: PlanFeature) => {
    setFeatureToDelete(planFeature);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeletePlanFeature = async () => {
    if (!featureToDelete || !planId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('plan_features')
        .delete()
        .eq('plan_id', planId)
        .eq('feature_id', featureToDelete.feature_id);

      if (error) throw error;
      showSuccess('Funcionalidade removida do plano com sucesso!');
      setIsConfirmDeleteOpen(false);
      setFeatureToDelete(null);
      fetchPlanFeatures(); // Recarrega a lista
    } catch (error: any) {
      console.error('Erro ao remover funcionalidade do plano:', error);
      showError('Erro ao remover funcionalidade do plano: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && planName === '') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Settings className="h-8 w-8 animate-spin text-gray-700" />
        <p className="text-gray-700 ml-2">Carregando funcionalidades do plano...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin-dashboard/plans')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">Gerenciar Funcionalidades do Plano: {planName}</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Funcionalidades Atribuídas</CardTitle>
          <Button onClick={handleAddFeatureClick} size="sm" className="h-8 gap-1">
            <PlusCircle className="h-3.5 w-3.5" /> Adicionar Funcionalidade
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Settings className="h-6 w-6 animate-spin text-gray-600" />
              <p className="text-gray-600 ml-2">Carregando funcionalidades...</p>
            </div>
          ) : planFeatures.length === 0 ? (
            <p className="text-gray-500">Nenhuma funcionalidade atribuída a este plano.</p>
          ) : (
            <div className="space-y-4">
              {planFeatures.map((pf) => (
                <div key={pf.feature_id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{pf.features.name}</p>
                    {pf.feature_limit !== null && (
                      <p className="text-sm text-gray-500">Limite: {pf.feature_limit}</p>
                    )}
                    {pf.features.description && (
                      <p className="text-xs text-gray-400 mt-1">{pf.features.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditFeatureClick(pf)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteConfirm(pf)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para Adicionar/Editar Funcionalidade */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlanFeature ? 'Editar Funcionalidade do Plano' : 'Adicionar Funcionalidade ao Plano'}</DialogTitle>
            <DialogDescription>
              {editingPlanFeature ? `Edite a funcionalidade ${editingPlanFeature.features.name} para o plano ${planName}.` : `Adicione uma nova funcionalidade ao plano ${planName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="feature" className="text-right">Funcionalidade</Label>
              <select
                id="feature"
                value={selectedFeatureId}
                onChange={(e) => setSelectedFeatureId(e.target.value)}
                className="col-span-3 p-2 border rounded-md"
                disabled={!!editingPlanFeature} // Desabilita seleção ao editar
              >
                <option value="">Selecione uma funcionalidade</option>
                {availableFeatures.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="limit" className="text-right">Limite (opcional)</Label>
              <Input
                id="limit"
                type="number"
                value={featureLimit === null ? '' : featureLimit}
                onChange={(e) => setFeatureLimit(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="col-span-3"
                placeholder="Ex: 100 (deixe em branco para ilimitado)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePlanFeature}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a funcionalidade '{featureToDelete?.features.name}' do plano '{planName}'?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeletePlanFeature}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanFeaturesManagementPage;
