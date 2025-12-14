-- Migration: Adicionar campos para suporte a funcionários horistas com turno único
-- shift_type: Tipo de turno (FULL_DAY, MORNING_ONLY, AFTERNOON_ONLY)
-- break_minutes: Minutos do intervalo (padrão 20 para horistas)

DO $$ 
BEGIN
    -- Adicionar shift_type
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_schedules' 
        AND column_name = 'shift_type'
    ) THEN
        ALTER TABLE work_schedules 
        ADD COLUMN shift_type TEXT CHECK (shift_type IN ('FULL_DAY', 'MORNING_ONLY', 'AFTERNOON_ONLY'));
        
        RAISE NOTICE 'Campo shift_type adicionado à tabela work_schedules';
    ELSE
        RAISE NOTICE 'Campo shift_type já existe na tabela work_schedules';
    END IF;

    -- Adicionar break_minutes
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_schedules' 
        AND column_name = 'break_minutes'
    ) THEN
        ALTER TABLE work_schedules 
        ADD COLUMN break_minutes INTEGER DEFAULT NULL;
        
        RAISE NOTICE 'Campo break_minutes adicionado à tabela work_schedules';
    ELSE
        RAISE NOTICE 'Campo break_minutes já existe na tabela work_schedules';
    END IF;

    -- Atualizar registros existentes para FULL_DAY (compatibilidade retroativa)
    UPDATE work_schedules 
    SET shift_type = 'FULL_DAY' 
    WHERE shift_type IS NULL;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN work_schedules.shift_type IS 'Tipo de turno: FULL_DAY (jornada completa manhã+tarde), MORNING_ONLY (turno único manhã), AFTERNOON_ONLY (turno único tarde)';
COMMENT ON COLUMN work_schedules.break_minutes IS 'Minutos do intervalo obrigatório (ex: 20 minutos para horistas). NULL para jornada completa padrão.';

