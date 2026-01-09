-- Migração: Adicionar campo occurrence_type à tabela processed_records
-- Para bancos Postgres (Supabase)
-- Tipos possíveis: NULL (normal), 'FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO'

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_type'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_type TEXT CHECK (occurrence_type IN ('FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO'));
        
        RAISE NOTICE 'Campo occurrence_type adicionado à tabela processed_records';
    ELSE
        RAISE NOTICE 'Campo occurrence_type já existe na tabela processed_records';
    END IF;
END $$;













