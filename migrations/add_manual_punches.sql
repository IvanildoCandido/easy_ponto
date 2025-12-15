-- Migration: Adicionar campos para indicar batidas manuais
-- Permite marcar batidas como manualmente corrigidas e preservá-las ao carregar novos arquivos

ALTER TABLE processed_records
ADD COLUMN IF NOT EXISTS manual_morning_entry BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_lunch_exit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_afternoon_entry BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_final_exit BOOLEAN DEFAULT false;

COMMENT ON COLUMN processed_records.manual_morning_entry IS 'Indica se a batida de entrada manhã foi corrigida manualmente';
COMMENT ON COLUMN processed_records.manual_lunch_exit IS 'Indica se a batida de saída almoço foi corrigida manualmente';
COMMENT ON COLUMN processed_records.manual_afternoon_entry IS 'Indica se a batida de entrada tarde foi corrigida manualmente';
COMMENT ON COLUMN processed_records.manual_final_exit IS 'Indica se a batida de saída final foi corrigida manualmente';

