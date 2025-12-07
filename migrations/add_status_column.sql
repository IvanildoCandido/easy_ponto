-- Migração: Adicionar campo status à tabela processed_records
-- Para bancos Postgres (Supabase)

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN status TEXT DEFAULT 'OK';
        
        -- Atualizar registros existentes para 'OK'
        UPDATE processed_records 
        SET status = 'OK' 
        WHERE status IS NULL;
        
        RAISE NOTICE 'Campo status adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo status já existe na tabela processed_records';
    END IF;
END $$;


