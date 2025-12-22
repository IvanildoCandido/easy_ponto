-- Migração: Adicionar tabela schedule_overrides para horários excepcionais por data específica
-- Permite que funcionários tenham horários diferentes para o mesmo dia da semana em datas específicas
-- Exemplo: Sábado completo em uma semana, meio expediente em outra semana

CREATE TABLE IF NOT EXISTS schedule_overrides (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  morning_start text,
  morning_end text,
  afternoon_start text,
  afternoon_end text,
  shift_type text CHECK (shift_type IN ('FULL_DAY', 'MORNING_ONLY', 'AFTERNOON_ONLY')),
  break_minutes integer DEFAULT NULL,
  interval_tolerance_minutes integer DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Índice para busca rápida por funcionário e data
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_employee_date ON schedule_overrides(employee_id, date);

-- Comentários para documentação
COMMENT ON TABLE schedule_overrides IS 'Horários excepcionais que sobrescrevem o schedule padrão para datas específicas. Exemplo: Sábado completo em algumas semanas, meio expediente em outras.';
COMMENT ON COLUMN schedule_overrides.date IS 'Data específica (formato: YYYY-MM-DD) para a qual este horário se aplica';
COMMENT ON COLUMN schedule_overrides.shift_type IS 'Tipo de turno para esta data específica. Se NULL, usa o tipo padrão do schedule geral';
COMMENT ON COLUMN schedule_overrides.morning_start IS 'Horário de entrada manhã para esta data. Se NULL, usa o horário padrão do schedule geral';
COMMENT ON COLUMN schedule_overrides.break_minutes IS 'Minutos do intervalo obrigatório para esta data. Se NULL, usa o valor padrão do schedule geral';




