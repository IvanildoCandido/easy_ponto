-- Migration para adicionar campos de ocorrência (horas e duração)
-- Executa tanto no SQLite quanto no Postgres (Supabase)

-- Para Postgres (Supabase)
DO $$ 
BEGIN
    -- Adicionar occurrence_hours_minutes (minutos que devem ser considerados para a ocorrência)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_hours_minutes'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_hours_minutes INTEGER;
        
        RAISE NOTICE 'Campo occurrence_hours_minutes adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo occurrence_hours_minutes já existe na tabela processed_records';
    END IF;

    -- Adicionar occurrence_duration (COMPLETA, MEIO_PERIODO, ou NULL para horas específicas)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_duration'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_duration TEXT CHECK (occurrence_duration IN ('COMPLETA', 'MEIO_PERIODO') OR occurrence_duration IS NULL);
        
        RAISE NOTICE 'Campo occurrence_duration adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo occurrence_duration já existe na tabela processed_records';
    END IF;
END $$;













