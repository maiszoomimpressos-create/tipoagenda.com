-- Migração: Criação da tabela banners
-- Tabela para armazenar banners das empresas
-- Constraint única garante 1 banner por empresa

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- company_id pode ser NULL para banners globais
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alterar a coluna company_id para permitir NULL, caso a tabela já exista e ainda não seja nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'banners'
      AND column_name = 'company_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE banners ALTER COLUMN company_id DROP NOT NULL;
  END IF;
END $$;

-- Remover a constraint única antiga, pois agora permitimos banners globais (company_id IS NULL)
DROP INDEX IF EXISTS banners_company_id_unique;

-- Nova constraint única para garantir 1 banner por empresa (apenas quando company_id NÃO É NULL)
CREATE UNIQUE INDEX IF NOT EXISTS banners_company_id_not_null_unique 
ON banners (company_id) WHERE company_id IS NOT NULL;

-- Índice para consultas por status ativo
CREATE INDEX IF NOT EXISTS idx_banners_is_active 
ON banners (is_active) WHERE is_active = true;

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS idx_banners_display_order 
ON banners (display_order);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at();


-- =====================================================
-- Função e Trigger: Limitar 1 banner por empresa E 20 banners globais
-- =====================================================
CREATE OR REPLACE FUNCTION enforce_banner_limits()
RETURNS TRIGGER AS $$
DECLARE
  company_banner_count INT;
  global_banner_count INT;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    -- Contar banners para a empresa específica (excluindo o próprio NEW se for UPDATE)
    SELECT COUNT(*)
    INTO company_banner_count
    FROM banners
    WHERE company_id = NEW.company_id
      AND id != NEW.id; -- Excluir o próprio banner em caso de UPDATE

    IF company_banner_count >= 1 THEN
      RAISE EXCEPTION 'Esta empresa já possui um banner. Apenas um banner por empresa é permitido.';
    END IF;
  ELSE
    -- Contar banners globais (company_id IS NULL), excluindo o próprio NEW se for UPDATE
    SELECT COUNT(*)
    INTO global_banner_count
    FROM banners
    WHERE company_id IS NULL
      AND id != NEW.id; -- Excluir o próprio banner em caso de UPDATE

    IF global_banner_count >= 20 THEN
      RAISE EXCEPTION 'O limite de 20 banners globais foi atingido.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT e UPDATE que enforce as regras
CREATE TRIGGER trigger_enforce_banner_limits
BEFORE INSERT OR UPDATE ON banners
FOR EACH ROW
EXECUTE FUNCTION enforce_banner_limits();

-- Comentários para a nova função e trigger
COMMENT ON FUNCTION enforce_banner_limits() IS 'Função que impõe os limites de 1 banner por empresa e 20 banners globais.';
COMMENT ON TRIGGER trigger_enforce_banner_limits IS 'Garante que as regras de limites de banners por empresa e banners globais são respeitadas.';

-- Comentários para documentação
COMMENT ON TABLE banners IS 'Tabela de banners vinculados às empresas ou globais. Empresas podem ter apenas 1 banner, e há um limite de 20 banners globais.';
COMMENT ON COLUMN banners.company_id IS 'Referência à empresa proprietária do banner (FK para companies.id)';
COMMENT ON COLUMN banners.title IS 'Título do banner';
COMMENT ON COLUMN banners.description IS 'Descrição opcional do banner';
COMMENT ON COLUMN banners.image_url IS 'URL da imagem do banner';
COMMENT ON COLUMN banners.link_url IS 'URL de destino quando o banner é clicado (opcional)';
COMMENT ON COLUMN banners.is_active IS 'Indica se o banner está ativo e deve ser exibido';
COMMENT ON COLUMN banners.display_order IS 'Ordem de exibição do banner (menor número = maior prioridade)';
COMMENT ON INDEX banners_company_id_not_null_unique IS 'Garante que cada empresa (company_id IS NOT NULL) tenha no máximo 1 banner.';

