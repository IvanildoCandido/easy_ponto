-- Migração: Adicionar 'ESQUECIMENTO_BATIDA' ao CHECK constraint de occurrence_type
-- Para bancos Postgres (Supabase)

-- Remover o constraint antigo e adicionar o novo com ESQUECIMENTO_BATIDA
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
        
        -- Adicionar novo constraint com ESQUECIMENTO_BATIDA
        ALTER TABLE processed_records 
        ADD CONSTRAINT processed_records_occurrence_type_check 
        CHECK (occurrence_type IS NULL OR occurrence_type IN ('FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO', 'ESQUECIMENTO_BATIDA'));
        
        RAISE NOTICE 'Constraint occurrence_type atualizado para incluir ESQUECIMENTO_BATIDA';
    ELSE
        -- Se não existir constraint, apenas adicionar o novo
        ALTER TABLE processed_records 
        ADD CONSTRAINT processed_records_occurrence_type_check 
        CHECK (occurrence_type IS NULL OR occurrence_type IN ('FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO', 'ESQUECIMENTO_BATIDA'));
        
        RAISE NOTICE 'Constraint occurrence_type criado com ESQUECIMENTO_BATIDA';
    END IF;
END $$;




