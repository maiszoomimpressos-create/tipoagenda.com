import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStatusColor } from '@/lib/dashboard-utils';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { usePrimaryCompany } from '@/hooks/usePrimaryCompany';
import { useSession } from '@/components/SessionContextProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentual' | 'fixed';
  discount_value: number;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  status: 'ativa' | 'pausada' | 'expirada';
}

// Zod schema for coupon creation
const couponSchema = z.object({
  code: z.string().min(3, "O código deve ter pelo menos 3 caracteres.").max(20, "Máximo de 20 caracteres."),
  discount_type: z.enum(['percentual', 'fixed'], {
    errorMap: () => ({ message: "Tipo de desconto é obrigatório." })
  }),
  discount_value: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val.replace(',', '.');
      }
      return val;
    },
    z.string()
      .regex(/^\d+(\.\d{1,2})?$/, "Valor inválido. Use formato 0.00 ou 0,00")
      .transform(Number)
      .refine(val => !isNaN(val) && val > 0, "Valor deve ser positivo.")
  ),
  valid_until: z.string().optional(),
  max_uses: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().int().min(1, "Usos máximos devem ser 1 ou mais.").optional()
  ),
});

type CouponFormValues = z.infer<typeof couponSchema>;

const FidelidadePage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const { primaryCompanyId, loadingPrimaryCompany } = usePrimaryCompany();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock state for points configuration (since we don't have a dedicated table for this yet)
  const [pointsConfig, setPointsConfig] = useState({
    pointsPerReal: 1,
    pointsForDiscount: 100,
    discountValue: 10.00,
    configLoading: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      discount_type: 'percentual',
      discount_value: '0.00' as any,
      valid_until: '',
      max_uses: undefined,
    },
  });

  const discountTypeValue = watch('discount_type');

  const fetchCoupons = useCallback(async () => {
    if (!primaryCompanyId) return;

    setLoadingCoupons(true);
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('company_id', primaryCompanyId)
      .order('created_at', { ascending: false });

    if (error) {
      showError('Erro ao carregar cupons: ' + error.message);
      console.error('Error fetching coupons:', error);
      setCoupons([]);
    } else if (data) {
      setCoupons(data as Coupon[]);
    }
    setLoadingCoupons(false);
  }, [primaryCompanyId]);

  useEffect(() => {
    if (primaryCompanyId && !loadingPrimaryCompany) {
      fetchCoupons();
    }
  }, [primaryCompanyId, loadingPrimaryCompany, fetchCoupons]);

  const onSubmitCoupon = async (data: CouponFormValues) => {
    setIsSubmitting(true);
    if (!primaryCompanyId || !session?.user) {
      showError('Erro de autenticação ou empresa primária não encontrada.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        company_id: primaryCompanyId,
        user_id: session.user.id,
        code: data.code.toUpperCase(),
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        valid_until: data.valid_until || null,
        max_uses: data.max_uses || null,
        current_uses: 0,
        status: 'ativa',
      };

      const { error: insertError } = await supabase
        .from('discount_coupons')
        .insert(payload);

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          throw new Error('Já existe um cupom com este código.');
        }
        throw insertError;
      }

      showSuccess('Cupom de desconto criado com sucesso!');
      reset();
      fetchCoupons();
    } catch (error: any) {
      console.error('Erro ao criar cupom:', error);
      showError('Erro ao criar cupom: ' + (error.message || 'Erro desconhecido.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingPrimaryCompany || loadingCoupons) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Carregando fidelidade e promoções...</p>
      </div>
    );
  }

  if (!primaryCompanyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-700 text-center mb-4">
          Você precisa ter uma empresa primária cadastrada para gerenciar fidelidade.
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Fidelidade e Promoções</h1>
        {/* Botão Nova Promoção pode ser usado para abrir um modal de criação de cupom ou outra promoção */}
        <Button 
          className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black"
          onClick={() => reset()} // Simplesmente reseta o formulário de cupom para facilitar a criação
        >
          <i className="fas fa-plus mr-2"></i>
          Novo Cupom
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Configuração de Pontos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Regras Atuais (Mock)</h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                <li>• {pointsConfig.pointsPerReal} ponto para cada R$ 1,00 gasto</li>
                <li>• {pointsConfig.pointsForDiscount} pontos = R$ {pointsConfig.discountValue.toFixed(2).replace('.', ',')} de desconto</li>
                <li>• Pontos expiram em 12 meses (Mock)</li>
              </ul>
            </div>
            <form className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pontos por Real gasto
                </label>
                <Input type="number" defaultValue={pointsConfig.pointsPerReal} className="border-gray-300 text-sm" disabled={pointsConfig.configLoading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pontos para desconto
                </label>
                <Input type="number" defaultValue={pointsConfig.pointsForDiscount} className="border-gray-300 text-sm" disabled={pointsConfig.configLoading} />
              </div>
              <Button className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black w-full" disabled={pointsConfig.configLoading}>
                Salvar Configurações (Mock)
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Criar Cupom de Desconto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmitCoupon)} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Código do Cupom *
                </label>
                <Input 
                  id="code"
                  placeholder="Ex: DESCONTO20" 
                  {...register('code')}
                  className="border-gray-300 text-sm" 
                />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <label htmlFor="discount_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Desconto *
                </label>
                <Select onValueChange={(value) => setValue('discount_type', value as 'percentual' | 'fixed', { shouldValidate: true })} value={discountTypeValue}>
                  <SelectTrigger id="discount_type" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.discount_type && <p className="text-red-500 text-xs mt-1">{errors.discount_type.message}</p>}
              </div>
              <div>
                <label htmlFor="discount_value" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Desconto * ({discountTypeValue === 'percentual' ? '%' : 'R$'})
                </label>
                <Input 
                  id="discount_value"
                  type="text" 
                  placeholder={discountTypeValue === 'percentual' ? "20" : "10.00"} 
                  {...register('discount_value')}
                  className="border-gray-300 text-sm" 
                />
                {errors.discount_value && <p className="text-red-500 text-xs mt-1">{errors.discount_value.message}</p>}
              </div>
              <div>
                <label htmlFor="valid_until" className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Validade (Opcional)
                </label>
                <Input 
                  id="valid_until"
                  type="date" 
                  {...register('valid_until')}
                  className="border-gray-300 text-sm" 
                />
                {errors.valid_until && <p className="text-red-500 text-xs mt-1">{errors.valid_until.message}</p>}
              </div>
              <div>
                <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700 mb-1">
                  Usos Máximos (Opcional)
                </label>
                <Input 
                  id="max_uses"
                  type="number" 
                  placeholder="Ilimitado" 
                  {...register('max_uses')}
                  className="border-gray-300 text-sm" 
                  min="1"
                />
                {errors.max_uses && <p className="text-red-500 text-xs mt-1">{errors.max_uses.message}</p>}
              </div>
              <Button 
                type="submit"
                className="!rounded-button whitespace-nowrap cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-black w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando...' : 'Criar Cupom'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Promoções Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coupons.length === 0 ? (
              <p className="text-gray-600">Nenhum cupom de desconto ativo.</p>
            ) : (
              coupons.map((coupon) => {
                const discountDisplay = coupon.discount_type === 'percentual' 
                  ? `${coupon.discount_value}% de desconto` 
                  : `R$ ${coupon.discount_value.toFixed(2).replace('.', ',')} de desconto`;
                const validadeDisplay = coupon.valid_until 
                  ? format(parseISO(coupon.valid_until), 'dd/MM/yyyy') 
                  : 'Sem validade';
                const usesDisplay = coupon.max_uses 
                  ? `${coupon.current_uses} / ${coupon.max_uses} usos`
                  : `${coupon.current_uses} usos`;

                return (
                  <div key={coupon.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <i className="fas fa-ticket-alt text-yellow-600"></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{coupon.code}</h3>
                        <p className="text-sm text-gray-600">{discountDisplay}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Válido até {validadeDisplay}</p>
                      <p className="text-sm text-gray-600">{usesDisplay}</p>
                    </div>
                    <Badge className={`${getStatusColor(coupon.status)} text-white text-xs`}>
                      {coupon.status}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FidelidadePage;