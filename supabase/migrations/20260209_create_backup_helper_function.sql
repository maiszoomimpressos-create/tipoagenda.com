-- =====================================================
-- FUNÇÃO AUXILIAR PARA EXPORTAR ESTRUTURAS DO BANCO
-- =====================================================
-- Esta função ajuda a exportar políticas RLS, functions e triggers
-- para incluir no backup completo

-- Função para exportar políticas RLS
CREATE OR REPLACE FUNCTION public.export_rls_policies()
RETURNS TABLE (
  export_sql TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_rec RECORD;
  sql_text TEXT;
BEGIN
  FOR policy_rec IN
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  LOOP
    sql_text := 'DROP POLICY IF EXISTS "' || policy_rec.policyname || '" ON ' || 
                policy_rec.schemaname || '.' || policy_rec.tablename || ';' || E'\n' ||
                'CREATE POLICY "' || policy_rec.policyname || '" ON ' || 
                policy_rec.schemaname || '.' || policy_rec.tablename || E'\n' ||
                '  FOR ' || policy_rec.cmd || E'\n';
    
    IF policy_rec.roles IS NOT NULL AND array_length(policy_rec.roles, 1) > 0 THEN
      sql_text := sql_text || '  TO ' || array_to_string(policy_rec.roles, ', ') || E'\n';
    END IF;
    
    IF policy_rec.qual IS NOT NULL THEN
      sql_text := sql_text || '  USING (' || policy_rec.qual || ')' || E'\n';
    END IF;
    
    IF policy_rec.with_check IS NOT NULL THEN
      sql_text := sql_text || '  WITH CHECK (' || policy_rec.with_check || ')' || E'\n';
    END IF;
    
    sql_text := sql_text || ';' || E'\n';
    
    RETURN QUERY SELECT sql_text;
  END LOOP;
END;
$$;

-- Função para exportar views
CREATE OR REPLACE FUNCTION public.export_views()
RETURNS TABLE (
  export_sql TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  view_rec RECORD;
  sql_text TEXT;
BEGIN
  FOR view_rec IN
    SELECT 
      schemaname,
      viewname,
      definition
    FROM pg_views
    WHERE schemaname = 'public'
    ORDER BY viewname
  LOOP
    sql_text := '-- View: ' || view_rec.viewname || E'\n' ||
                'DROP VIEW IF EXISTS ' || view_rec.schemaname || '.' || view_rec.viewname || ' CASCADE;' || E'\n' ||
                'CREATE OR REPLACE VIEW ' || view_rec.schemaname || '.' || view_rec.viewname || ' AS' || E'\n' ||
                view_rec.definition || ';' || E'\n';
    
    RETURN QUERY SELECT sql_text;
  END LOOP;
END;
$$;

-- Função para exportar functions
CREATE OR REPLACE FUNCTION public.export_functions()
RETURNS TABLE (
  export_sql TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  func_rec RECORD;
  sql_text TEXT;
BEGIN
  FOR func_rec IN
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname
  LOOP
    sql_text := '-- Function: ' || func_rec.function_name || E'\n' ||
                func_rec.definition || ';' || E'\n';
    
    RETURN QUERY SELECT sql_text;
  END LOOP;
END;
$$;

-- Função para exportar triggers
CREATE OR REPLACE FUNCTION public.export_triggers()
RETURNS TABLE (
  export_sql TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trigger_rec RECORD;
  sql_text TEXT;
BEGIN
  FOR trigger_rec IN
    SELECT 
      trigger_name,
      event_manipulation,
      event_object_table,
      action_statement,
      action_timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  LOOP
    sql_text := '-- Trigger: ' || trigger_rec.trigger_name || ' na tabela ' || trigger_rec.event_object_table || E'\n' ||
                'DROP TRIGGER IF EXISTS ' || trigger_rec.trigger_name || ' ON ' || trigger_rec.event_object_table || ';' || E'\n' ||
                '-- ' || trigger_rec.action_statement || E'\n';
    
    RETURN QUERY SELECT sql_text;
  END LOOP;
END;
$$;

-- Função para exportar schema completo das tabelas (CREATE TABLE)
CREATE OR REPLACE FUNCTION public.export_table_schemas()
RETURNS TABLE (
  export_sql TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_rec RECORD;
  col_rec RECORD;
  constraint_rec RECORD;
  sql_text TEXT;
  pk_constraints TEXT[];
  fk_constraints TEXT[];
  unique_constraints TEXT[];
  check_constraints TEXT[];
  constraint_cols TEXT;
BEGIN
  FOR table_rec IN
    SELECT 
      table_schema,
      table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    sql_text := '-- ============================================' || E'\n';
    sql_text := sql_text || '-- Tabela: ' || table_rec.table_name || E'\n';
    sql_text := sql_text || '-- ============================================' || E'\n' || E'\n';
    sql_text := sql_text || 'DROP TABLE IF EXISTS ' || table_rec.table_schema || '.' || table_rec.table_name || ' CASCADE;' || E'\n';
    sql_text := sql_text || 'CREATE TABLE ' || table_rec.table_schema || '.' || table_rec.table_name || ' (' || E'\n';
    
    -- Coletar definições de colunas
    FOR col_rec IN
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = table_rec.table_schema
        AND table_name = table_rec.table_name
      ORDER BY ordinal_position
    LOOP
      sql_text := sql_text || '  ' || col_rec.column_name || ' ';
      
      -- Tipo de dados
      IF col_rec.data_type = 'character varying' THEN
        sql_text := sql_text || 'VARCHAR(' || col_rec.character_maximum_length || ')';
      ELSIF col_rec.data_type = 'character' THEN
        sql_text := sql_text || 'CHAR(' || col_rec.character_maximum_length || ')';
      ELSIF col_rec.data_type = 'numeric' THEN
        IF col_rec.numeric_scale > 0 THEN
          sql_text := sql_text || 'NUMERIC(' || col_rec.numeric_precision || ',' || col_rec.numeric_scale || ')';
        ELSE
          sql_text := sql_text || 'NUMERIC(' || col_rec.numeric_precision || ')';
        END IF;
      ELSIF col_rec.data_type = 'USER-DEFINED' THEN
        sql_text := sql_text || col_rec.udt_name;
      ELSE
        sql_text := sql_text || UPPER(col_rec.data_type);
      END IF;
      
      -- NOT NULL
      IF col_rec.is_nullable = 'NO' THEN
        sql_text := sql_text || ' NOT NULL';
      END IF;
      
      -- DEFAULT
      IF col_rec.column_default IS NOT NULL THEN
        sql_text := sql_text || ' DEFAULT ' || col_rec.column_default;
      END IF;
      
      sql_text := sql_text || ',' || E'\n';
    END LOOP;
    
    -- Coletar PRIMARY KEY (agrupando colunas por constraint)
    pk_constraints := ARRAY[]::TEXT[];
    FOR constraint_rec IN
      SELECT 
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema = table_rec.table_schema
        AND tc.table_name = table_rec.table_name
        AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY tc.constraint_name
    LOOP
      pk_constraints := array_append(pk_constraints, 
        '  CONSTRAINT ' || constraint_rec.constraint_name || ' PRIMARY KEY (' || constraint_rec.columns || ')');
    END LOOP;
    
    -- Coletar FOREIGN KEY (agrupando colunas por constraint)
    fk_constraints := ARRAY[]::TEXT[];
    FOR constraint_rec IN
      SELECT DISTINCT
        tc.constraint_name,
        string_agg(DISTINCT kcu.column_name, ', ' ORDER BY kcu.column_name) as local_columns,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        string_agg(DISTINCT ccu.column_name, ', ' ORDER BY ccu.column_name) as foreign_columns,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.constraint_schema
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.table_schema = table_rec.table_schema
        AND tc.table_name = table_rec.table_name
        AND tc.constraint_type = 'FOREIGN KEY'
      GROUP BY tc.constraint_name, ccu.table_schema, ccu.table_name, rc.update_rule, rc.delete_rule
    LOOP
      fk_constraints := array_append(fk_constraints,
        '  CONSTRAINT ' || constraint_rec.constraint_name || ' FOREIGN KEY (' || constraint_rec.local_columns || ') ' ||
        'REFERENCES ' || constraint_rec.foreign_table_schema || '.' || constraint_rec.foreign_table_name || 
        '(' || constraint_rec.foreign_columns || ') ' ||
        'ON UPDATE ' || COALESCE(constraint_rec.update_rule, 'NO ACTION') || ' ' ||
        'ON DELETE ' || COALESCE(constraint_rec.delete_rule, 'NO ACTION'));
    END LOOP;
    
    -- Coletar UNIQUE (agrupando colunas por constraint)
    unique_constraints := ARRAY[]::TEXT[];
    FOR constraint_rec IN
      SELECT 
        tc.constraint_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      WHERE tc.table_schema = table_rec.table_schema
        AND tc.table_name = table_rec.table_name
        AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name
    LOOP
      unique_constraints := array_append(unique_constraints,
        '  CONSTRAINT ' || constraint_rec.constraint_name || ' UNIQUE (' || constraint_rec.columns || ')');
    END LOOP;
    
    -- Coletar CHECK constraints
    check_constraints := ARRAY[]::TEXT[];
    FOR constraint_rec IN
      SELECT 
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
      WHERE tc.table_schema = table_rec.table_schema
        AND tc.table_name = table_rec.table_name
        AND tc.constraint_type = 'CHECK'
    LOOP
      check_constraints := array_append(check_constraints,
        '  CONSTRAINT ' || constraint_rec.constraint_name || ' CHECK (' || constraint_rec.check_clause || ')');
    END LOOP;
    
    -- Adicionar constraints ao SQL
    IF array_length(pk_constraints, 1) > 0 THEN
      sql_text := sql_text || array_to_string(pk_constraints, ',' || E'\n') || ',' || E'\n';
    END IF;
    
    IF array_length(fk_constraints, 1) > 0 THEN
      sql_text := sql_text || array_to_string(fk_constraints, ',' || E'\n') || ',' || E'\n';
    END IF;
    
    IF array_length(unique_constraints, 1) > 0 THEN
      sql_text := sql_text || array_to_string(unique_constraints, ',' || E'\n') || ',' || E'\n';
    END IF;
    
    IF array_length(check_constraints, 1) > 0 THEN
      sql_text := sql_text || array_to_string(check_constraints, ',' || E'\n') || ',' || E'\n';
    END IF;
    
    -- Remover última vírgula e fechar CREATE TABLE
    sql_text := rtrim(sql_text, ',' || E'\n') || E'\n';
    sql_text := sql_text || ');' || E'\n' || E'\n';
    
    RETURN QUERY SELECT sql_text;
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.export_rls_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_views() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_triggers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_table_schemas() TO authenticated;

