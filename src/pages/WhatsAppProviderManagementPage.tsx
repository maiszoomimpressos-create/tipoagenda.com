import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, ArrowLeft, MessageSquare, Edit, CheckCircle2, XCircle, Save } from 'lucide-react';
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

interface MessagingProvider {
  id: string;
  name: string;
  channel: string;
  base_url: string;
  http_method: 'GET' | 'POST' | 'PUT';
  auth_key: string | null;
  auth_token: string | null;
  payload_template: any;
  content_type?: string | null;
  is_active: boolean;
}

const WhatsAppProviderManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<MessagingProvider[]>([]);
  const [editingProvider, setEditingProvider] = useState<MessagingProvider | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    base_url: '',
    http_method: 'POST' as 'GET' | 'POST' | 'PUT',
    auth_key: 'Authorization',
    auth_token: '',
    payload_template: '{"to": "{phone}", "message": "{text}"}',
    content_type: 'json' as 'json' | 'form-data',
    is_active: true,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messaging_providers')
        .select('*')
        .eq('channel', 'WHATSAPP')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar provedores:', error);
      showError('Erro ao carregar provedores: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEdit = (provider: MessagingProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      base_url: provider.base_url,
      http_method: provider.http_method,
      auth_key: provider.auth_key || 'Authorization',
      auth_token: provider.auth_token || '',
      payload_template: typeof provider.payload_template === 'string' 
        ? provider.payload_template 
        : JSON.stringify(provider.payload_template, null, 2),
      content_type: (provider.content_type as 'json' | 'form-data') || 'json',
      is_active: provider.is_active,
    });
  };

  const handleCancelEdit = () => {
    setEditingProvider(null);
    setFormData({
      name: '',
      base_url: '',
      http_method: 'POST',
      auth_key: 'Authorization',
      auth_token: '',
      payload_template: '{"to": "{phone}", "message": "{text}"}',
      content_type: 'json',
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.base_url.trim()) {
      showError('Preencha todos os campos obrigatórios.');
      return;
    }

    // Validar JSON do payload_template
    try {
      JSON.parse(formData.payload_template);
    } catch (e) {
      showError('O template do payload deve ser um JSON válido.');
      return;
    }

    setSaving(true);
    try {
      const payloadTemplateJson = JSON.parse(formData.payload_template);

      if (editingProvider) {
        // Atualizar provedor existente
        const { error } = await supabase
          .from('messaging_providers')
          .update({
            name: formData.name.trim(),
            base_url: formData.base_url.trim(),
            http_method: formData.http_method,
            auth_key: formData.auth_key.trim() || null,
            auth_token: formData.auth_token.trim() || null,
            payload_template: payloadTemplateJson,
            content_type: formData.content_type,
            is_active: formData.is_active,
          })
          .eq('id', editingProvider.id);

        if (error) throw error;
        showSuccess('Provedor atualizado com sucesso!');
      } else {
        // Criar novo provedor
        const { error } = await supabase
          .from('messaging_providers')
          .insert({
            name: formData.name.trim(),
            channel: 'WHATSAPP',
            base_url: formData.base_url.trim(),
            http_method: formData.http_method,
            auth_key: formData.auth_key.trim() || null,
            auth_token: formData.auth_token.trim() || null,
            payload_template: payloadTemplateJson,
            content_type: formData.content_type,
            is_active: formData.is_active,
          });

        if (error) throw error;
        showSuccess('Provedor criado com sucesso!');
      }

      handleCancelEdit();
      fetchProviders();
    } catch (error: any) {
      console.error('Erro ao salvar provedor:', error);
      showError('Erro ao salvar provedor: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!providerToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('messaging_providers')
        .delete()
        .eq('id', providerToDelete);

      if (error) throw error;
      showSuccess('Provedor excluído com sucesso!');
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      fetchProviders();
    } catch (error: any) {
      console.error('Erro ao excluir provedor:', error);
      showError('Erro ao excluir provedor: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gerenciar Provedores WhatsApp
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure os provedores de WhatsApp que serão usados para envio de mensagens
            </p>
          </div>
        </div>

        {/* Formulário de Edição/Criação */}
        {editingProvider && (
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                {editingProvider.id ? 'Editar Provedor' : 'Novo Provedor'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Provedor *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Evolution API, Twilio"
                  />
                </div>
                <div>
                  <Label>Método HTTP *</Label>
                  <Select
                    value={formData.http_method}
                    onValueChange={(value: 'GET' | 'POST' | 'PUT') => setFormData({ ...formData, http_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>URL Base da API *</Label>
                <Input
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  placeholder="https://api.provedor.com/v1/send"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL completa do endpoint que receberá as mensagens
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Header de Autenticação</Label>
                  <Input
                    value={formData.auth_key}
                    onChange={(e) => setFormData({ ...formData, auth_key: e.target.value })}
                    placeholder="Authorization, X-API-Key, etc"
                  />
                </div>
                <div>
                  <Label>Token/Chave de Autenticação</Label>
                  <Input
                    type="password"
                    value={formData.auth_token}
                    onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                    placeholder="Bearer TOKEN ou API_KEY"
                  />
                </div>
              </div>

              <div>
                <Label>Tipo de Conteúdo *</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value: 'json' | 'form-data') => setFormData({ ...formData, content_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON (application/json)</SelectItem>
                    <SelectItem value="form-data">Form Data (multipart/form-data)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Escolha o tipo de conteúdo que a API do provedor espera receber.
                </p>
              </div>

              <div>
                <Label>Template do Payload *</Label>
                <Textarea
                  value={formData.payload_template}
                  onChange={(e) => setFormData({ ...formData, payload_template: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                  placeholder={formData.content_type === 'form-data' 
                    ? '{"number": "{phone}", "body": "{text}", "userId": "", "queueId": "", "status": "pending"}'
                    : '{"to": "{phone}", "message": "{text}"}'
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.content_type === 'form-data' 
                    ? 'Use {"{phone}"} para o telefone e {"{text}"} para o texto. Campos vazios podem ser "" ou omitidos. Deve ser um JSON válido.'
                    : 'Use {"{phone}"} para o telefone e {"{text}"} para o texto da mensagem. Deve ser um JSON válido.'
                  }
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="provider-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="provider-active" className="cursor-pointer">
                  Provedor ativo
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-yellow-600 hover:bg-yellow-700 text-black">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingProvider.id ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Provedores */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <CardDescription>
              {providers.length === 0 
                ? 'Nenhum provedor configurado. Clique em "Novo Provedor" para criar.'
                : `${providers.length} provedor(es) configurado(s)`
              }
            </CardDescription>
            {!editingProvider && (
              <Button
                onClick={() => {
                  setEditingProvider({} as MessagingProvider);
                  setFormData({
                    name: '',
                    base_url: '',
                    http_method: 'POST',
                    auth_key: 'Authorization',
                    auth_token: '',
                    payload_template: '{"to": "{phone}", "message": "{text}"}',
                    content_type: 'json',
                    is_active: true,
                  });
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-black"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Novo Provedor
              </Button>
            )}
          </div>

          {providers.map((provider) => (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{provider.name}</CardTitle>
                      {provider.is_active ? (
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
                    <CardDescription>Canal: {provider.channel}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(provider)}
                      disabled={!!editingProvider}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProviderToDelete(provider.id);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={!!editingProvider}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500">URL Base</Label>
                  <p className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    {provider.base_url}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Método HTTP</Label>
                    <p className="text-sm">{provider.http_method}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Header de Auth</Label>
                    <p className="text-sm">{provider.auth_key || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Template do Payload</Label>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                    {JSON.stringify(provider.payload_template, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este provedor? Esta ação não pode ser desfeita.
                Todas as empresas que usam este provedor não conseguirão enviar mensagens até que outro provedor seja configurado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProviderToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default WhatsAppProviderManagementPage;

