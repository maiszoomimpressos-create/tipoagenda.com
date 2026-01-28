import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, ArrowLeft, Settings } from 'lucide-react';
import { PlusCircle as PlusCircleIcon } from 'lucide-react'; // Importar PlusCircle para o botão de criar
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Feature {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  company_flag_name: string | null;
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
  const [creatingNewFeature, setCreatingNewFeature] = useState(false); // Novo estado

  // Estado para o modal de adicionar/editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanFeature, setEditingPlanFeature] = useState<PlanFeature | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');
  const [featureLimit, setFeatureLimit] = useState<number | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState<PlanFeature | null>(null);
  const [featureName, setFeatureName] = useState(''); // Novo estado para o nome da funcionalidade
  const [featureDescription, setFeatureDescription] = useState<string | null>(null); // Novo estado para a descrição
  const [companyFlagName, setCompanyFlagName] = useState<string>(''); // Estado para o flag da empresa

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
          plan_id,
          feature_id,
          feature_limit,
          features (
            id,
            name,
            slug,
            description,
            is_active,
            company_flag_name
          )
        `)
        .eq('plan_id', planId);

      if (error) throw error;
      console.log('fetchPlanFeatures: Raw data from Supabase:', data); // DEBUG LOG
      // O Supabase retorna features como objeto, não array
      setPlanFeatures(data as unknown as PlanFeature[]);
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
    setSelectedFeatureId(''); // Não será mais usado diretamente para a entrada
    setFeatureName('');
    setFeatureDescription('');
    setFeatureLimit(null);
    setCompanyFlagName('none');
    setIsModalOpen(true);
  };

  const handleEditFeatureClick = (planFeature: PlanFeature) => {
    console.log('handleEditFeatureClick: planFeature recebido:', planFeature);
    setEditingPlanFeature(planFeature);
    setSelectedFeatureId(planFeature.feature_id); // Manter o ID para o update
    setFeatureName(planFeature.features.name); // Preencher o nome da funcionalidade
    setFeatureDescription(planFeature.features.description || ''); // Preencher a descrição (garantir string vazia se for null)
    setFeatureLimit(planFeature.feature_limit);
    setCompanyFlagName(planFeature.features.company_flag_name || 'none');
    setIsModalOpen(true);
  };

  const handleSavePlanFeature = async () => {
    if (!planId || !featureName.trim()) {
      showError('O nome da funcionalidade é obrigatório.');
      return;
    }

    setLoading(true);
    let featureIdToAssociate: string | null = null;

    try {
      // 1. Tentar encontrar uma funcionalidade existente pelo nome
      const { data: existingFeature, error: fetchFeatureError } = await supabase
        .from('features')
        .select('id, description, company_flag_name')
        .eq('name', featureName.trim())
        .single();

      if (fetchFeatureError && fetchFeatureError.code !== 'PGRST116') { // PGRST116 = No rows found
        throw fetchFeatureError;
      }

      if (existingFeature) {
        featureIdToAssociate = existingFeature.id;
        // Se estiver editando uma funcionalidade e o nome mudou, ou a descrição mudou
        if (editingPlanFeature && editingPlanFeature.feature_id === existingFeature.id) {
          // Atualiza descrição e flag se mudaram
          const updates: { description?: string; company_flag_name?: string | null } = {};
          if (existingFeature.description !== featureDescription) {
            updates.description = featureDescription;
          }
          const flagValue = (companyFlagName === 'none' || !companyFlagName.trim()) ? null : companyFlagName.trim();
          if (existingFeature.company_flag_name !== flagValue) {
            updates.company_flag_name = flagValue;
          }
          if (Object.keys(updates).length > 0) {
            const { error: updateFeatureError } = await supabase
              .from('features')
              .update(updates)
              .eq('id', existingFeature.id);
            if (updateFeatureError) throw updateFeatureError;
          }
        } else if (!editingPlanFeature) {
          // Se estiver adicionando e a funcionalidade já existe, atualiza o flag se necessário
          const flagValue = (companyFlagName === 'none' || !companyFlagName.trim()) ? null : companyFlagName.trim();
          if (existingFeature.company_flag_name !== flagValue) {
            const { error: updateFeatureError } = await supabase
              .from('features')
              .update({ company_flag_name: flagValue })
              .eq('id', existingFeature.id);
            if (updateFeatureError) throw updateFeatureError;
          }
        }
      } else {
        // 2. Se a funcionalidade não existe, criar uma nova
        const flagValue = (companyFlagName === 'none' || !companyFlagName.trim()) ? null : companyFlagName.trim();
        const { data: newFeature, error: createFeatureError } = await supabase
          .from('features')
          .insert({
            name: featureName.trim(),
            slug: featureName.trim().toLowerCase().replace(/\s/g, '-'),
            description: featureDescription,
            company_flag_name: flagValue,
            is_active: true,
          })
          .select('id')
          .single();

        if (createFeatureError) throw createFeatureError;
        featureIdToAssociate = newFeature.id;
        showSuccess(`Funcionalidade "${featureName}" criada com sucesso!`);
      }

      if (!featureIdToAssociate) {
        throw new Error('Não foi possível determinar a funcionalidade para associar.');
      }

      console.log(`handleSavePlanFeature: planId: ${planId}, featureIdToAssociate: ${featureIdToAssociate}, featureLimit: ${featureLimit}`);

      // 3. Associar (ou atualizar) a funcionalidade ao plano
      if (editingPlanFeature) {
        console.log('handleSavePlanFeature (EDITING): editingPlanFeature.feature_id:', editingPlanFeature.feature_id, 'featureIdToAssociate:', featureIdToAssociate);
        // Se o ID da funcionalidade mudou durante a edição
        if (editingPlanFeature.feature_id !== featureIdToAssociate) {
          // Primeiro, remova a antiga associação
          const { error: deleteOldError } = await supabase
            .from('plan_features')
            .delete()
            .eq('plan_id', planId)
            .eq('feature_id', editingPlanFeature.feature_id);
          if (deleteOldError) throw deleteOldError;

          // Em seguida, adicione a nova associação
          const { error: insertNewError } = await supabase
            .from('plan_features')
            .insert({
              plan_id: planId,
              feature_id: featureIdToAssociate,
              feature_limit: featureLimit,
            });
          if (insertNewError) throw insertNewError;
        } else {
          // Atualizar limite para funcionalidade existente
          const { error } = await supabase
            .from('plan_features')
            .update({ feature_limit: featureLimit })
            .eq('plan_id', planId)
            .eq('feature_id', featureIdToAssociate);
          if (error) throw error;
        }
        showSuccess('Funcionalidade do plano atualizada com sucesso!');
      } else {
        // Adicionar nova associação
        const { error } = await supabase
          .from('plan_features')
          .insert({
            plan_id: planId,
            feature_id: featureIdToAssociate,
            feature_limit: featureLimit,
          });

        if (error) throw error;
        showSuccess('Funcionalidade adicionada ao plano com sucesso!');
      }

      setIsModalOpen(false);
      fetchPlanFeatures(); // Recarrega a lista
      fetchAvailableFeatures(); // Recarrega as funcionalidades disponíveis (caso uma nova tenha sido criada)
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
    console.log(`handleDeletePlanFeature: planId: ${planId}, featureToDelete.feature_id: ${featureToDelete.feature_id}`);

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
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{pf.features.name}</p>
                      {pf.features.company_flag_name && (
                        <Badge variant="secondary" className="text-xs">
                          Controla: {pf.features.company_flag_name}
                        </Badge>
                      )}
                    </div>
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
              <Label htmlFor="feature-name" className="text-right">Nome da Funcionalidade</Label>
              <Input
                id="feature-name"
                type="text"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                className="col-span-3"
                placeholder="Ex: Envio de Mensagens WhatsApp"
                disabled={creatingNewFeature || (!!editingPlanFeature && editingPlanFeature.features.name === featureName)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="feature-description" className="text-right">Descrição (Opcional)</Label>
              <Textarea
                id="feature-description"
                value={featureDescription || ''}
                onChange={(e) => setFeatureDescription(e.target.value)}
                className="col-span-3"
                placeholder="Uma breve descrição sobre a funcionalidade."
                disabled={creatingNewFeature}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company-flag" className="text-right">Controla Flag da Empresa</Label>
              <Select
                value={companyFlagName || 'none'}
                onValueChange={(value) => setCompanyFlagName(value === 'none' ? '' : value)}
                disabled={creatingNewFeature}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o flag (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (apenas descritiva)</SelectItem>
                  <SelectItem value="whatsapp_messaging_enabled">whatsapp_messaging_enabled</SelectItem>
                  {/* Adicione mais flags conforme necessário */}
                </SelectContent>
              </Select>
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
                disabled={creatingNewFeature}
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
