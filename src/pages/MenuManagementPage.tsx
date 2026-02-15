import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ArrowLeft, Menu, Edit, CheckCircle2, XCircle, Save, Plus, Trash2, HelpCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Menu {
  id: string;
  menu_key: string;
  label: string;
  icon: string;
  path: string;
  display_order: number;
  is_active: boolean;
  description: string | null;
}

interface Plan {
  id: string;
  name: string;
  status: string;
}

interface MenuPlan {
  menu_id: string;
  plan_id: string;
  plans: Plan;
}

const MenuManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [menuForPlans, setMenuForPlans] = useState<Menu | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [menuPlans, setMenuPlans] = useState<Record<string, string[]>>({});
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    menu_key: '',
    label: '',
    icon: '',
    path: '',
    display_order: 0,
    is_active: true,
    description: '',
  });

  useEffect(() => {
    fetchMenus();
    fetchPlans();
  }, []);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .order('display_order', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;
      setMenus(data || []);

      // Buscar planos vinculados a cada menu
      if (data && data.length > 0) {
        const menuIds = data.map(m => m.id);
        const { data: menuPlansData, error: plansError } = await supabase
          .from('menu_plans')
          .select('menu_id, plan_id, subscription_plans(id, name, status)')
          .in('menu_id', menuIds);

        if (plansError) {
          console.error('[MenuManagementPage] Erro ao buscar planos vinculados:', plansError);
        }

        if (!plansError && menuPlansData) {
          console.log('[MenuManagementPage] Planos vinculados encontrados:', menuPlansData);
          const plansMap: Record<string, string[]> = {};
          menuPlansData.forEach((mp: any) => {
            if (!plansMap[mp.menu_id]) {
              plansMap[mp.menu_id] = [];
            }
            plansMap[mp.menu_id].push(mp.plan_id);
          });
          console.log('[MenuManagementPage] Mapa de planos por menu:', plansMap);
          setMenuPlans(plansMap);
        } else {
          console.warn('[MenuManagementPage] Nenhum plano vinculado encontrado ou erro na busca');
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar menus:', error);
      showError('Erro ao carregar menus: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar planos:', error);
      showError('Erro ao carregar planos: ' + error.message);
    }
  }, []);

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      menu_key: menu.menu_key,
      label: menu.label,
      icon: menu.icon,
      path: menu.path,
      display_order: menu.display_order,
      is_active: menu.is_active,
      description: menu.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingMenu(null);
    setFormData({
      menu_key: '',
      label: '',
      icon: '',
      path: '',
      display_order: 0,
      is_active: true,
      description: '',
    });
  };

  const handleSave = async () => {
    if (!formData.menu_key.trim() || !formData.label.trim() || !formData.icon.trim() || !formData.path.trim()) {
      showError('Preencha todos os campos obrigatórios (Chave, Nome, Ícone e Rota).');
      return;
    }

    if (!formData.path.startsWith('/')) {
      showError('A rota deve começar com "/".');
      return;
    }

    setSaving(true);
    try {
      if (editingMenu) {
        // Atualizar menu existente
        const { error } = await supabase
          .from('menus')
          .update({
            menu_key: formData.menu_key.trim(),
            label: formData.label.trim(),
            icon: formData.icon.trim(),
            path: formData.path.trim(),
            display_order: formData.display_order,
            is_active: formData.is_active,
            description: formData.description.trim() || null,
          })
          .eq('id', editingMenu.id);

        if (error) throw error;
        showSuccess('Menu atualizado com sucesso!');
      } else {
        // Criar novo menu
        const { error } = await supabase
          .from('menus')
          .insert({
            menu_key: formData.menu_key.trim(),
            label: formData.label.trim(),
            icon: formData.icon.trim(),
            path: formData.path.trim(),
            display_order: formData.display_order,
            is_active: formData.is_active,
            description: formData.description.trim() || null,
          });

        if (error) throw error;
        showSuccess('Menu criado com sucesso!');
      }

      handleCancelEdit();
      fetchMenus();
    } catch (error: any) {
      console.error('Erro ao salvar menu:', error);
      showError('Erro ao salvar menu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!menuToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuToDelete);

      if (error) throw error;
      showSuccess('Menu excluído com sucesso!');
      setDeleteDialogOpen(false);
      setMenuToDelete(null);
      fetchMenus();
    } catch (error: any) {
      console.error('Erro ao excluir menu:', error);
      showError('Erro ao excluir menu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPlanDialog = (menu: Menu) => {
    setMenuForPlans(menu);
    setSelectedPlanIds(menuPlans[menu.id] || []);
    setPlanDialogOpen(true);
  };

  const handleSaveMenuPlans = async () => {
    if (!menuForPlans) {
      showError('Erro: Menu não encontrado.');
      return;
    }

    setSaving(true);
    try {
      console.log('Salvando planos para menu:', menuForPlans.id);
      console.log('Planos selecionados:', selectedPlanIds);

      // Deletar todas as vinculações existentes
      const { error: deleteError } = await supabase
        .from('menu_plans')
        .delete()
        .eq('menu_id', menuForPlans.id);

      if (deleteError) {
        console.error('Erro ao deletar vinculações antigas:', deleteError);
        throw deleteError;
      }

      console.log('Vinculações antigas deletadas com sucesso');

      // Inserir novas vinculações
      if (selectedPlanIds.length > 0) {
        const menuPlansToInsert = selectedPlanIds.map(planId => ({
          menu_id: menuForPlans.id,
          plan_id: planId,
        }));

        console.log('Inserindo novas vinculações:', menuPlansToInsert);

        const { data: insertedData, error: insertError } = await supabase
          .from('menu_plans')
          .insert(menuPlansToInsert)
          .select();

        if (insertError) {
          console.error('Erro ao inserir vinculações:', insertError);
          throw insertError;
        }

        console.log('Vinculações inseridas com sucesso:', insertedData);
      } else {
        console.log('Nenhum plano selecionado, apenas removendo vinculações existentes');
      }

      // Atualizar o estado local imediatamente
      setMenuPlans(prev => ({
        ...prev,
        [menuForPlans.id]: selectedPlanIds,
      }));

      showSuccess('Planos vinculados com sucesso!');
      setPlanDialogOpen(false);
      setMenuForPlans(null);
      setSelectedPlanIds([]);
      
      // Recarregar menus para garantir sincronização
      await fetchMenus();
    } catch (error: any) {
      console.error('Erro completo ao salvar vinculação de planos:', error);
      showError('Erro ao salvar vinculação de planos: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
          <p className="text-gray-700 dark:text-gray-300">Carregando menus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin-dashboard')}
              className="!rounded-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Menu className="h-8 w-8 text-blue-600" />
                Gestão de Menus
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gerencie os menus do sistema e vincule-os a planos de assinatura
              </p>
            </div>
          </div>
        </div>

        {/* Help Card */}
        {!editingMenu && (
          <Card className="border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 dark:text-blue-400 text-xl">💡</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Dicas para preencher o formulário:
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li><strong>Chave do Menu:</strong> Use apenas letras minúsculas e hífens (ex: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">dashboard</code>)</li>
                    <li><strong>Nome do Menu:</strong> Nome que aparecerá na tela (ex: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Dashboard</code>)</li>
                    <li><strong>Ícone:</strong> Classe Font Awesome (ex: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">fas fa-chart-line</code>)</li>
                    <li><strong>Rota:</strong> URL que será aberta, sempre começando com <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/</code></li>
                    <li><strong>Ordem:</strong> Menor número aparece primeiro (use 0, 10, 20...)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Card */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {editingMenu ? 'Editar Menu' : 'Novo Menu'}
                </CardTitle>
                <CardDescription>
                  {editingMenu 
                    ? 'Altere as informações do menu abaixo' 
                    : 'Preencha os dados para criar um novo menu. Campos com * são obrigatórios.'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHelpDialogOpen(true)}
                className="!rounded-button"
                title="Ajuda - Guia de Cadastro de Menus"
              >
                <HelpCircle className="h-5 w-5 text-blue-600" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="menu_key">Chave do Menu *</Label>
                <Input
                  id="menu_key"
                  value={formData.menu_key}
                  onChange={(e) => setFormData({ ...formData, menu_key: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="Ex: dashboard, agendamentos, servicos"
                  className="mt-1"
                  disabled={!!editingMenu}
                />
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Identificador único</strong> (não pode ser alterado depois). 
                  <br />Use apenas letras minúsculas e hífens. Exemplos: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">dashboard</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mensagens-whatsapp</code>
                </p>
              </div>

              <div>
                <Label htmlFor="label">Nome do Menu *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ex: Dashboard, Agendamentos"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icon">Ícone (Font Awesome) *</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Ex: fas fa-chart-line, fas fa-briefcase"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Classe CSS do Font Awesome. <strong>Campo obrigatório - não pode ficar em branco.</strong>
                  <br />Exemplos: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">fas fa-chart-line</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">fas fa-briefcase</code> (Serviços)
                  <br />
                  <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    🔍 Buscar ícones em fontawesome.com
                  </a>
                </p>
              </div>

              <div>
                <Label htmlFor="path">Rota *</Label>
                <Input
                  id="path"
                  value={formData.path}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Garantir que comece com /
                    if (value && !value.startsWith('/')) {
                      value = '/' + value;
                    }
                    setFormData({ ...formData, path: value });
                  }}
                  placeholder="Ex: /dashboard, /agendamentos/:companyId"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <strong>URL que será aberta</strong> quando o menu for clicado.
                  <br />Deve começar com <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/</code>
                  <br />Exemplos: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/dashboard</code>, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/agendamentos/:companyId</code>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <strong>Menor número = aparece primeiro</strong> no menu lateral.
                  <br />Recomendado: use intervalos de 10 (0, 10, 20, 30...) para facilitar inserções futuras.
                  <br />Exemplo: Dashboard=0, Agendamentos=10, Serviços=20
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Menu Ativo?</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Controla se este menu está ativo no sistema
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Página principal com resumo de métricas e KPIs"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Texto explicativo sobre o propósito do menu. Não aparece para os usuários finais, apenas para referência administrativa.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !formData.menu_key.trim() || !formData.label.trim() || !formData.icon.trim() || !formData.path.trim()}
                className="!rounded-button bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingMenu ? 'Atualizar' : 'Criar'}
                  </>
                )}
              </Button>
              {editingMenu && (
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="!rounded-button"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* List Card */}
        <Card className="border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Menus Cadastrados</CardTitle>
            <CardDescription>
              {menus.length === 0 
                ? 'Nenhum menu cadastrado' 
                : `${menus.length} menu(s) cadastrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {menus.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Menu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum menu encontrado. Crie o primeiro menu acima.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {menus.map((menu) => {
                  const linkedPlans = menuPlans[menu.id] || [];
                  const linkedPlanData = plans.filter(p => linkedPlans.includes(p.id));
                  
                  // Debug: Log para verificar o que está sendo exibido
                  if (linkedPlans.length > 0 && linkedPlanData.length === 0) {
                    console.warn(`[MenuManagementPage] Menu ${menu.label} tem ${linkedPlans.length} planos vinculados, mas nenhum encontrado na lista de planos ativos.`, {
                      menuId: menu.id,
                      linkedPlanIds: linkedPlans,
                      availablePlanIds: plans.map(p => p.id),
                    });
                  }

                  return (
                    <Card key={menu.id} className="border-gray-200 dark:border-gray-700">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{menu.label}</CardTitle>
                              {menu.is_active ? (
                                <Badge className="bg-green-500">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inativo
                                </Badge>
                              )}
                            </div>
                            <CardDescription>
                              <div className="space-y-1">
                                <p>Chave: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{menu.menu_key}</code></p>
                                <p>Rota: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{menu.path}</code></p>
                                <p>Ícone: <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{menu.icon}</code></p>
                                <p>Ordem: {menu.display_order}</p>
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Planos Vinculados:</p>
                                  {linkedPlanData.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {linkedPlanData.map((plan) => (
                                        <Badge 
                                          key={plan.id} 
                                          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                                        >
                                          {plan.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <Badge variant="outline" className="text-gray-500">
                                      Nenhum plano vinculado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(menu)}
                              disabled={!!editingMenu}
                              className="!rounded-button"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPlanDialog(menu)}
                              disabled={!!editingMenu}
                              className="!rounded-button"
                            >
                              <Menu className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMenuToDelete(menu.id);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={!!editingMenu}
                              className="!rounded-button text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este menu? Esta ação não pode ser desfeita.
                <br />
                <strong className="text-red-600">
                  Atenção: Todas as vinculações com planos e permissões serão removidas.
                </strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Plan Selection Dialog */}
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vincular Menu a Planos</DialogTitle>
              <DialogDescription>
                Selecione os planos de assinatura que terão acesso a este menu: <strong>{menuForPlans?.label}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {plans.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum plano ativo encontrado.</p>
              ) : (
                plans.map((plan) => (
                  <div key={plan.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`plan-${plan.id}`}
                      checked={selectedPlanIds.includes(plan.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPlanIds([...selectedPlanIds, plan.id]);
                        } else {
                          setSelectedPlanIds(selectedPlanIds.filter(id => id !== plan.id));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`plan-${plan.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {plan.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPlanDialogOpen(false);
                  setMenuForPlans(null);
                  setSelectedPlanIds([]);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveMenuPlans}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Help Dialog */}
        <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                Guia de Cadastro de Menus
              </DialogTitle>
              <DialogDescription>
                Este guia explica como preencher cada campo do formulário de cadastro de menus.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h2>📝 Campos do Formulário</h2>
                
                <h3>1. Chave do Menu ⭐ (Obrigatório)</h3>
                <p><strong>O que é?</strong></p>
                <ul>
                  <li>Identificador único do menu no sistema</li>
                  <li>Usado internamente pelo código</li>
                  <li><strong>NÃO pode ser alterado depois de criado</strong></li>
                  <li>Use apenas letras minúsculas, números e hífens</li>
                </ul>
                <p><strong>Exemplos corretos:</strong></p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
dashboard
agendamentos
servicos
clientes
colaboradores
financeiro
estoque
relatorios
fidelidade
mensagens-whatsapp
planos
config
                </pre>
                <p><strong>❌ Erros comuns:</strong></p>
                <ul>
                  <li>Dashboard (maiúscula)</li>
                  <li>menu_dashboard (underscore - use hífen)</li>
                  <li>Menu Dashboard (espaços)</li>
                </ul>

                <h3>2. Nome do Menu ⭐ (Obrigatório)</h3>
                <p><strong>O que é?</strong></p>
                <ul>
                  <li>Nome que aparece na tela para o usuário</li>
                  <li>Pode ter maiúsculas, espaços e acentos</li>
                  <li>É o texto visível no menu lateral</li>
                </ul>
                <p><strong>Exemplos:</strong></p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
Dashboard
Agendamentos
Serviços
Clientes
Colaboradores
Financeiro
Estoque
Relatórios
Fidelidade
Mensagens WhatsApp
Planos
Configurações
                </pre>

                <h3>3. Ícone (Font Awesome) ⭐ (Obrigatório)</h3>
                <p><strong>O que é?</strong></p>
                <ul>
                  <li>Classe CSS do Font Awesome para o ícone</li>
                  <li>Formato: <code>fas fa-nome-do-icone</code></li>
                  <li>Você pode buscar ícones em: <a href="https://fontawesome.com/icons" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">fontawesome.com/icons</a></li>
                </ul>
                <p><strong>Exemplos:</strong></p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
fas fa-chart-line          (Dashboard)
fas fa-calendar-alt        (Agendamentos)
fas fa-briefcase           (Serviços)
fas fa-users               (Clientes)
fas fa-user-tie            (Colaboradores)
fas fa-dollar-sign         (Financeiro)
fas fa-boxes               (Estoque)
fas fa-chart-bar           (Relatórios)
fas fa-gift                (Fidelidade)
fas fa-comments            (Mensagens WhatsApp)
fas fa-gem                 (Planos)
fas fa-cog                 (Configurações)
                </pre>

                <h3>4. Rota ⭐ (Obrigatório)</h3>
                <p><strong>O que é?</strong></p>
                <ul>
                  <li>URL/path que o menu vai abrir quando clicado</li>
                  <li><strong>SEMPRE deve começar com /</strong> (barra)</li>
                  <li>Pode ter parâmetros dinâmicos (ex: <code>:companyId</code>)</li>
                </ul>
                <p><strong>Exemplos:</strong></p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
/dashboard
/agendamentos/:companyId
/servicos
/clientes
/colaboradores
/financeiro
/estoque
/relatorios
/fidelidade
/mensagens-whatsapp
/planos
/config
                </pre>

                <h3>5. Ordem de Exibição (Opcional)</h3>
                <p><strong>O que é?</strong></p>
                <ul>
                  <li>Número que define a ordem dos menus no sidebar</li>
                  <li><strong>Menor número = aparece primeiro</strong></li>
                  <li>Padrão: <code>0</code></li>
                </ul>
                <p><strong>Exemplos:</strong></p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
0  → Dashboard (primeiro)
10 → Agendamentos
20 → Serviços
30 → Clientes
40 → Colaboradores
50 → Financeiro
60 → Estoque
70 → Relatórios
80 → Fidelidade
90 → Mensagens WhatsApp
100 → Planos
110 → Configurações (último)
                </pre>
                <p><strong>Dica:</strong> Use intervalos de 10 (0, 10, 20, 30...) para facilitar inserir novos menus no meio depois.</p>

                <h3>6. Menu Ativo? (Toggle Switch)</h3>
                <p><strong>O que é?</strong></p>
                <ul>
                  <li>Liga/Desliga se o menu está ativo no sistema</li>
                  <li><strong>Ligado (azul)</strong> = Menu aparece no sistema</li>
                  <li><strong>Desligado (cinza)</strong> = Menu fica oculto</li>
                </ul>

                <h3>7. Descrição (Opcional)</h3>
                <p><strong>O que é?</strong></p>
                <ul>
                  <li>Texto explicativo sobre o que o menu faz</li>
                  <li>Ajuda outros administradores a entenderem o propósito</li>
                  <li>Não aparece para os usuários finais</li>
                </ul>

                <h2>🎯 Exemplo Completo: Cadastrando o Menu "Dashboard"</h2>
                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
Chave do Menu:        dashboard
Nome do Menu:         Dashboard
Ícone:                fas fa-chart-line
Rota:                 /dashboard
Ordem de Exibição:    0
Menu Ativo?:          ✅ Ligado
Descrição:            Página principal com resumo de métricas e KPIs
                </pre>

                <h2>⚠️ Importante: Depois de Criar o Menu</h2>
                <ol>
                  <li><strong>Vincular a Planos:</strong>
                    <ul>
                      <li>Após criar, clique no ícone de menu (📋) ao lado do menu criado</li>
                      <li>Selecione quais planos de assinatura terão acesso a esse menu</li>
                      <li>Ex: Selecione "Plano Básico" e "Plano Premium"</li>
                    </ul>
                  </li>
                  <li><strong>Configurar Permissões (Proprietário):</strong>
                    <ul>
                      <li>O proprietário da empresa precisa ir em "Permissões de Menu"</li>
                      <li>Lá ele define quais funções (Gerente, Colaborador) têm acesso a cada menu</li>
                    </ul>
                  </li>
                </ol>

                <h2>✅ Checklist Antes de Salvar</h2>
                <ul>
                  <li>Chave do Menu: Apenas minúsculas, sem espaços</li>
                  <li>Nome do Menu: Nome amigável que aparecerá na tela</li>
                  <li>Ícone: Classe Font Awesome válida (fas fa-...)</li>
                  <li>Rota: Começa com / e está correta</li>
                  <li>Ordem: Número definido (0, 10, 20...)</li>
                  <li>Ativo: Ligado se quiser que apareça</li>
                  <li>Descrição: Preenchida (opcional mas recomendado)</li>
                </ul>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setHelpDialogOpen(false)} className="!rounded-button">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MenuManagementPage;

