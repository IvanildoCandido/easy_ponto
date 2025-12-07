-- Migração: Adicionar campos para cálculo CLT (Art. 58 §1º e Súmula 366 TST)
-- Adiciona: early_exit_seconds, balance_seconds

-- Adicionar coluna early_exit_seconds (saída antecipada)
ALTER TABLE processed_records 
ADD COLUMN IF NOT EXISTS early_exit_seconds INTEGER DEFAULT 0;

-- Adicionar coluna balance_seconds (saldo do dia)
ALTER TABLE processed_records 
ADD COLUMN IF NOT EXISTS balance_seconds INTEGER DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN processed_records.early_exit_seconds IS 'Saída antecipada em segundos (conforme CLT)';
COMMENT ON COLUMN processed_records.balance_seconds IS 'Saldo do dia em segundos: (hora_extra + chegada_antecipada) - (atraso + saida_antecipada)';


