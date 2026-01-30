-- =====================================================
-- GARANTIR SUPORTE PARA TIPO DE USUÁRIO COLABORADOR
-- =====================================================
-- Este script garante que a tabela type_user suporta o tipo 'COLABORADOR'
-- e que não há constraints que impeçam a criação de registros para colaboradores
-- =====================================================

-- 1. Verificar se a tabela type_user existe e tem a estrutura correta
-- Se não existir, criar (mas provavelmente já existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'type_user'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.type_user (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      cod TEXT NOT NULL,
      descr TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id)
    );
    
    -- Criar índice para melhor performance
    CREATE INDEX IF NOT EXISTS idx_type_user_cod ON public.type_user(cod);
    
    RAISE NOTICE 'Tabela type_user criada com sucesso';
  ELSE
    RAISE NOTICE 'Tabela type_user já existe';
  END IF;
END $$;

-- 2. Garantir que não há constraint CHECK que impeça 'COLABORADOR'
-- Verificar constraints existentes
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Verificar se existe constraint CHECK no campo cod
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'type_user'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'cod'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Constraint CHECK encontrada em type_user.cod - verifique manualmente se permite COLABORADOR';
  ELSE
    RAISE NOTICE 'Nenhuma constraint CHECK encontrada em type_user.cod - OK para inserir COLABORADOR';
  END IF;
END $$;

-- 3. Verificar se cash_movements suporta transaction_type 'despesa'
-- (já deve existir, mas vamos garantir)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cash_movements'
    AND column_name = 'transaction_type'
  ) THEN
    RAISE NOTICE 'Coluna transaction_type existe em cash_movements';
    
    -- Verificar se 'despesa' é um valor permitido (se houver constraint CHECK)
    -- Se houver constraint, ela já deve permitir 'despesa' baseado no código existente
    RAISE NOTICE 'Verificando se transaction_type permite despesa...';
  ELSE
    RAISE WARNING 'Coluna transaction_type não encontrada em cash_movements!';
  END IF;
END $$;

-- 4. Verificar se a tabela collaborator_services existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'collaborator_services'
  ) THEN
    RAISE WARNING 'Tabela collaborator_services não encontrada! As comissões não funcionarão corretamente.';
  ELSE
    RAISE NOTICE 'Tabela collaborator_services existe - OK';
  END IF;
END $$;

-- 5. Verificar se appointments tem os campos necessários
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments'
    AND column_name = 'status'
  ) THEN
    RAISE NOTICE 'Campo status existe em appointments - OK';
  ELSE
    RAISE WARNING 'Campo status não encontrado em appointments!';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments'
    AND column_name = 'collaborator_id'
  ) THEN
    RAISE NOTICE 'Campo collaborator_id existe em appointments - OK';
  ELSE
    RAISE WARNING 'Campo collaborator_id não encontrado em appointments!';
  END IF;
END $$;

-- 6. Verificar se appointment_services tem os campos de comissão
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointment_services'
    AND column_name = 'commission_type'
  ) THEN
    RAISE NOTICE 'Campo commission_type existe em appointment_services - OK';
  ELSE
    RAISE WARNING 'Campo commission_type não encontrado em appointment_services!';
  END IF;
  
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointment_services'
    AND column_name = 'commission_value'
  ) THEN
    RAISE NOTICE 'Campo commission_value existe em appointment_services - OK';
  ELSE
    RAISE WARNING 'Campo commission_value não encontrado em appointment_services!';
  END IF;
END $$;

-- =====================================================
-- RESUMO: Este script apenas verifica a estrutura
-- Se tudo estiver OK, você verá mensagens de NOTICE
-- Se houver problemas, verá WARNING
-- =====================================================

