/**
 * Serviço de gerenciamento de banners
 * 
 * Lógica de negócio para garantir que cada empresa
 * tenha apenas 1 banner, conforme constraint do banco.
 */

import { supabase } from '@/integrations/supabase/client';

export interface Banner {
  id: string;
  company_id: string | null; // Agora pode ser nulo para banners globais
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBannerData {
  company_id?: string; // Agora opcional para banners globais
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateBannerData {
  title?: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  is_active?: boolean;
  display_order?: number;
}

/**
 * Busca o banner de uma empresa específica (company_id IS NOT NULL)
 * @param companyId - ID da empresa
 * @returns Banner da empresa ou null se não existir
 */
export async function getBannerByCompanyId(companyId: string): Promise<Banner | null> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Nenhum banner encontrado
      return null;
    }
    throw error;
  }

  return data as Banner;
}

/**
 * Cria um novo banner
 * @param bannerData - Dados do banner a ser criado
 * @returns Banner criado
 * @throws Error se as regras de limite (1 por empresa, 20 globais) forem violadas
 */
export async function createBanner(bannerData: CreateBannerData): Promise<Banner> {
  const { data, error } = await supabase
    .from('banners')
    .insert({
      ...bannerData,
      is_active: bannerData.is_active ?? true,
      display_order: bannerData.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Banner;
}

/**
 * Atualiza um banner existente
 * @param bannerId - ID do banner
 * @param updateData - Dados a serem atualizados
 * @returns Banner atualizado
 */
export async function updateBanner(
  bannerId: string,
  updateData: UpdateBannerData
): Promise<Banner> {
  const { data, error } = await supabase
    .from('banners')
    .update(updateData)
    .eq('id', bannerId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Banner;
}

/**
 * Cria ou atualiza um banner. Se companyId for fornecido, tenta atualizar o banner daquela empresa. Se não, tenta criar um novo banner global.
 * @param bannerData - Dados do banner
 * @returns Banner atualizado ou criado
 */
export async function upsertBanner(bannerData: CreateBannerData): Promise<Banner> {
  if (bannerData.company_id) {
    // Tentar encontrar banner existente para a empresa
    const existingBanner = await getBannerByCompanyId(bannerData.company_id);
    if (existingBanner) {
      return await updateBanner(existingBanner.id, bannerData);
    }
  }
  // Se não tem company_id ou não encontrou banner existente, criar um novo
  return await createBanner(bannerData);
}

/**
 * Exclui um banner
 * @param bannerId - ID do banner
 */
export async function deleteBanner(bannerId: string): Promise<void> {
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', bannerId);

  if (error) {
    throw error;
  }
}

/**
 * Lista todos os banners, com opção de filtrar por company_id
 * @param companyId - Opcional. Se fornecido, lista apenas banners daquela empresa.
 * @returns Lista de banners com informações da empresa (se houver)
 */
export async function getAllBanners(companyId?: string): Promise<(Banner & { companies?: { name: string } })[]> {
  let query = supabase
    .from('banners')
    .select(`
      *,
      companies:company_id (
        name
      )
    `);

  if (companyId) {
    query = query.eq('company_id', companyId);
  } else {
    query = query.is('company_id', null); // Buscar apenas banners globais se companyId não for fornecido
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as (Banner & { companies?: { name: string } })[];
}

/**
 * Lista todos os banners globais (company_id IS NULL)
 * @returns Lista de banners globais
 */
export async function getGlobalBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .is('company_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as Banner[];
}

