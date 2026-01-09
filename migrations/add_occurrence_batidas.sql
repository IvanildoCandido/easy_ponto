-- Migration para adicionar campos de ocorrência por batida
-- Permite marcar quais batidas (E. Manhã, S. Alm., E. Tarde, S. Tarde) são afetadas pela ocorrência
-- Para Postgres (Supabase)

DO $$ 
BEGIN
    -- Adicionar occurrence_morning_entry
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_morning_entry'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_morning_entry BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Campo occurrence_morning_entry adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo occurrence_morning_entry já existe na tabela processed_records';
    END IF;

    -- Adicionar occurrence_lunch_exit
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_lunch_exit'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_lunch_exit BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Campo occurrence_lunch_exit adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo occurrence_lunch_exit já existe na tabela processed_records';
    END IF;

    -- Adicionar occurrence_afternoon_entry
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_afternoon_entry'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_afternoon_entry BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Campo occurrence_afternoon_entry adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo occurrence_afternoon_entry já existe na tabela processed_records';
    END IF;

    -- Adicionar occurrence_final_exit
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_final_exit'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_final_exit BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Campo occurrence_final_exit adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo occurrence_final_exit já existe na tabela processed_records';
    END IF;
END $$;












