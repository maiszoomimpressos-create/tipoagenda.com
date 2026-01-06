-- =====================================================
-- Migração: Criar bucket de storage para banners
-- Descrição: Cria o bucket "banners" no Supabase Storage
--            com políticas de acesso apropriadas
-- =====================================================

-- Criar o bucket "banners" se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true, -- Bucket público para leitura
  5242880, -- Limite de 5MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Políticas de acesso para o bucket "banners"
-- =====================================================

-- Política: Permitir leitura pública (qualquer pessoa pode ver as imagens)
DROP POLICY IF EXISTS "Banners públicos - leitura" ON storage.objects;
CREATE POLICY "Banners públicos - leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Política: Permitir upload apenas para usuários autenticados
DROP POLICY IF EXISTS "Banners - upload autenticado" ON storage.objects;
CREATE POLICY "Banners - upload autenticado"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Política: Permitir atualização apenas para usuários autenticados
DROP POLICY IF EXISTS "Banners - atualização autenticada" ON storage.objects;
CREATE POLICY "Banners - atualização autenticada"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Política: Permitir exclusão apenas para usuários autenticados
DROP POLICY IF EXISTS "Banners - exclusão autenticada" ON storage.objects;
CREATE POLICY "Banners - exclusão autenticada"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Comentários
COMMENT ON POLICY "Banners públicos - leitura" ON storage.objects IS 'Permite que qualquer pessoa visualize as imagens dos banners';
COMMENT ON POLICY "Banners - upload autenticado" ON storage.objects IS 'Permite que usuários autenticados façam upload de imagens de banners';
COMMENT ON POLICY "Banners - atualização autenticada" ON storage.objects IS 'Permite que usuários autenticados atualizem imagens de banners';
COMMENT ON POLICY "Banners - exclusão autenticada" ON storage.objects IS 'Permite que usuários autenticados excluam imagens de banners';

