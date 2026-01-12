-- Migration: Tabela para correções manuais de batidas de ponto
-- Permite que administradores corrijam manualmente batidas erradas

-- Criar tabela para armazenar correções manuais
CREATE TABLE IF NOT EXISTS manual_punch_corrections (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  morning_entry TEXT,
  lunch_exit TEXT,
  afternoon_entry TEXT,
  final_exit TEXT,
  corrected_by TEXT, -- Opcional: quem corrigiu (pode ser email ou nome)
  correction_reason TEXT, -- Opcional: motivo da correção
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_manual_punch_corrections_employee_date 
  ON manual_punch_corrections(employee_id, date);

CREATE INDEX IF NOT EXISTS idx_manual_punch_corrections_date 
  ON manual_punch_corrections(date);

COMMENT ON TABLE manual_punch_corrections IS 
  'Armazena correções manuais de batidas de ponto. Quando existir um registro aqui, os horários serão usados no lugar dos horários do arquivo importado.';

-- Adicionar campos para indicar quais batidas são manuais em processed_records
ALTER TABLE processed_records
  ADD COLUMN IF NOT EXISTS is_manual_morning_entry BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_manual_lunch_exit BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_manual_afternoon_entry BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_manual_final_exit BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN processed_records.is_manual_morning_entry IS 
  'Indica se a batida de entrada da manhã foi corrigida manualmente';
COMMENT ON COLUMN processed_records.is_manual_lunch_exit IS 
  'Indica se a batida de saída do almoço foi corrigida manualmente';
COMMENT ON COLUMN processed_records.is_manual_afternoon_entry IS 
  'Indica se a batida de entrada da tarde foi corrigida manualmente';
COMMENT ON COLUMN processed_records.is_manual_final_exit IS 
  'Indica se a batida de saída final foi corrigida manualmente';











