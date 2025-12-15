import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Edit, Trash2, Tag, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminCouponFormModal from '@/components/AdminCouponFormModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AdminCoupon {
  id: string;
  code: string;
  discount_type: 'percentual' | 'fixed';
  discount_value: number;
  valid_until: string | null;
  max_uses: number;
  current_uses: number;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
}

const AdminCouponManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all coupons (RLS ensures only Global Admin can see all)
      const { data, error } = await supabase
        .from('admin_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Update status if expired based on valid_until date
      const updatedCoupons = data.map(coupon => {
        if (coupon.status === 'active' && coupon.valid_until && isPast(parseISO(coupon.valid_until))) {
          return { ...coupon, status: 'expired' as const };
        }
        return coupon;
      });

      setCoupons(updatedCoupons as AdminCoupon[]);
    } catch (error: any) {
      console.error('Error fetching admin coupons:', error);
      showError('Erro ao carregar cupons administrativos: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleAddCoupon = () => {
    setEditingCoupon(null);
    setIsFormModalOpen(true);
  };

  const handleEditCoupon = (coupon: AdminCoupon) => {
    setEditingCoupon(coupon);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (couponId: string) => {
    setCouponToDelete(couponId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (couponToDelete) {
      setLoading(true);
      const { error } = await supabase
        .from('admin_coupons')
        .delete()
        .eq('id', couponToDelete);

      if (error) {
        showError('Erro ao excluir cupom: ' + error.message);
        console.error('Error deleting coupon:', error);
      } else {
        showSuccess('Cupom excluído com sucesso!');
        fetchCoupons();
      }
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setCouponToDelete(null);
    }
  };

  const getStatusBadge = (status: AdminCoupon['status']) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 text-white flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Ativo</Badge>;
      case 'inactive': return <Badge className="bg-gray-500 text-white flex items-center gap-1"><Clock className="h-3 w-3" /> Inativo</Badge>;
      case 'expired': return <Badge className="bg-red-500 text-white flex items-center gap-1"><XCircle className="h-3 w-3" /> Expirado</Badge>;
      default: return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatDiscount = (coupon: AdminCoupon) => {
    if (coupon.discount_type === 'percentual') {
      return `${coupon.discount_value}% OFF`;
    }
    return `R$ ${coupon.discount_value.toFixed(2).replace('.', ',')} OFF`;
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Cupons Administrativos</h1>
      </div>

      <div className="max-w-4xl space-y-6">
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-gray-900">Cupons para Proprietários</CardTitle>
            <Button
              className="!rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
              onClick={handleAddCoupon}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-700">Carregando cupons...</p>
            ) : coupons.length === 0 ? (
              <p className="text-gray-600">Nenhum cupom administrativo cadastrado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desconto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usos (Max)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Válido Até</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900 flex items-center gap-2">
                          <Tag className="h-4 w-4 text-yellow-600" />
                          {coupon.code}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {formatDiscount(coupon)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {coupon.current_uses} / {coupon.max_uses}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {coupon.valid_until ? format(parseISO(coupon.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : 'Ilimitado'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {getStatusBadge(coupon.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="!rounded-button whitespace-nowrap"
                            onClick={() => handleEditCoupon(coupon)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="!rounded-button whitespace-nowrap"
                            onClick={() => handleDeleteClick(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminCouponFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingCoupon={editingCoupon}
        onCouponSaved={fetchCoupons}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este cupom administrativo? Esta ação não pode ser desfeita.
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

export default AdminCouponManagementPage;