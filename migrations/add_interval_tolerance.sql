-- Migração: Adicionar campo interval_tolerance_minutes para tolerância de intervalo
-- Permite configurar quantos minutos a mais no intervalo são permitidos sem considerar excesso

DO $$ 
BEGIN
    -- Adicionar interval_tolerance_minutes
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_schedules' 
        AND column_name = 'interval_tolerance_minutes'
    ) THEN
        ALTER TABLE work_schedules 
        ADD COLUMN interval_tolerance_minutes INTEGER DEFAULT NULL;
        
        RAISE NOTICE 'Campo interval_tolerance_minutes adicionado à tabela work_schedules';
    ELSE
        RAISE NOTICE 'Campo interval_tolerance_minutes já existe na tabela work_schedules';
    END IF;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN work_schedules.interval_tolerance_minutes IS 'Tolerância de intervalo em minutos (ex: 20 para permitir até 20min a mais no intervalo sem considerar excesso). NULL = sem tolerância (comportamento padrão).';

