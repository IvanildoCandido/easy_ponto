-- Migração: Adicionar 'FERIAS' ao CHECK constraint de occurrence_type
-- Para bancos Postgres (Supabase)

-- Remover o constraint antigo e adicionar o novo com FERIAS
DO $$ 
BEGIN
    -- Verificar se o constraint existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'processed_records' 
          AND constraint_name LIKE '%occurrence_type%check%'
    ) THEN
        -- Remover constraint antigo
        ALTER TABLE processed_records 
        DROP CONSTRAINT IF EXISTS processed_records_occurrence_type_check;
        
        -- Adicionar novo constraint com FERIAS
        ALTER TABLE processed_records 
        ADD CONSTRAINT processed_records_occurrence_type_check 
        CHECK (occurrence_type IS NULL OR occurrence_type IN ('FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO', 'LICENCA', 'ESQUECIMENTO_BATIDA', 'FERIAS'));
        
        RAISE NOTICE 'Constraint occurrence_type atualizado para incluir FERIAS';
    ELSE
        -- Se não existir constraint, apenas adicionar o novo
        ALTER TABLE processed_records 
        ADD CONSTRAINT processed_records_occurrence_type_check 
        CHECK (occurrence_type IS NULL OR occurrence_type IN ('FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO', 'LICENCA', 'ESQUECIMENTO_BATIDA', 'FERIAS'));
        
        RAISE NOTICE 'Constraint occurrence_type criado com FERIAS';
    END IF;
END $$;

