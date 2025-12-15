-- Migração: Criar tabela work_schedule_exceptions para permitir horários específicos por data
-- Permite sobrescrever o horário padrão do dia da semana para datas específicas
-- Útil para casos onde um funcionário trabalha em alguns sábados com carga horária completa
-- e em outros sábados apenas meio expediente

CREATE TABLE IF NOT EXISTS work_schedule_exceptions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  morning_start TEXT,
  morning_end TEXT,
  afternoon_start TEXT,
  afternoon_end TEXT,
  shift_type TEXT CHECK (shift_type IN ('FULL_DAY', 'MORNING_ONLY', 'AFTERNOON_ONLY')),
  break_minutes INTEGER DEFAULT NULL,
  interval_tolerance_minutes INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date),
  CONSTRAINT work_schedule_exceptions_date_check CHECK (date IS NOT NULL)
);

-- Índice para buscas rápidas por funcionário e data
CREATE INDEX IF NOT EXISTS idx_work_schedule_exceptions_employee_date 
ON work_schedule_exceptions(employee_id, date);

-- Índice para buscas por data
CREATE INDEX IF NOT EXISTS idx_work_schedule_exceptions_date 
ON work_schedule_exceptions(date);

-- Comentários para documentação
COMMENT ON TABLE work_schedule_exceptions IS 
'Exceções de escala por data. Permite definir horários específicos para datas específicas, sobrescrevendo o horário padrão do dia da semana. Útil para casos onde um funcionário tem horários diferentes no mesmo dia da semana durante o mês (ex: alguns sábados com carga completa, outros com meio expediente).';

COMMENT ON COLUMN work_schedule_exceptions.employee_id IS 'ID do funcionário';
COMMENT ON COLUMN work_schedule_exceptions.date IS 'Data específica da exceção (formato: YYYY-MM-DD)';
COMMENT ON COLUMN work_schedule_exceptions.morning_start IS 'Horário de entrada da manhã (HH:mm) ou NULL se não trabalha de manhã';
COMMENT ON COLUMN work_schedule_exceptions.morning_end IS 'Horário de saída para almoço (HH:mm) ou NULL se não trabalha de manhã';
COMMENT ON COLUMN work_schedule_exceptions.afternoon_start IS 'Horário de entrada da tarde (HH:mm) ou NULL se não trabalha de tarde';
COMMENT ON COLUMN work_schedule_exceptions.afternoon_end IS 'Horário de saída final (HH:mm) ou NULL se não trabalha de tarde';
COMMENT ON COLUMN work_schedule_exceptions.shift_type IS 'Tipo de turno: FULL_DAY (jornada completa), MORNING_ONLY (turno único manhã), AFTERNOON_ONLY (turno único tarde)';
COMMENT ON COLUMN work_schedule_exceptions.break_minutes IS 'Minutos do intervalo obrigatório (ex: 20 minutos para horistas). NULL para jornada completa padrão.';
COMMENT ON COLUMN work_schedule_exceptions.interval_tolerance_minutes IS 'Tolerância de intervalo em minutos. NULL = sem tolerância.';

