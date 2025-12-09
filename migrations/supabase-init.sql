-- Schema inicial do Supabase/Postgres para o Easy Ponto
-- Execute este arquivo no SQL Editor do Supabase para criar/ajustar o schema.

CREATE TABLE IF NOT EXISTS employees (
  id serial PRIMARY KEY,
  en_no integer UNIQUE NOT NULL,
  name text NOT NULL,
  department text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_schedules (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  morning_start text,
  morning_end text,
  afternoon_start text,
  afternoon_end text,
  UNIQUE(employee_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS time_records (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_no integer,
  tm_no integer,
  mode integer,
  in_out integer NOT NULL,
  vm text,
  department text,
  datetime timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON time_records(employee_id, datetime);

CREATE TABLE IF NOT EXISTS processed_records (
  id serial PRIMARY KEY,
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  first_entry text,
  last_exit text,
  morning_entry text,
  lunch_exit text,
  afternoon_entry text,
  final_exit text,
  expected_start text,
  expected_end text,
  delay_seconds integer DEFAULT 0,
  early_arrival_seconds integer DEFAULT 0,
  overtime_seconds integer DEFAULT 0,
  early_exit_seconds integer DEFAULT 0,
  worked_minutes integer DEFAULT 0,
  expected_minutes integer DEFAULT 0,
  balance_seconds integer DEFAULT 0,
  interval_excess_seconds integer DEFAULT 0,
  atraso_clt_minutes integer DEFAULT 0,
  chegada_antec_clt_minutes integer DEFAULT 0,
  extra_clt_minutes integer DEFAULT 0,
  saida_antec_clt_minutes integer DEFAULT 0,
  saldo_clt_minutes integer DEFAULT 0,
  status text DEFAULT 'OK',
  UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_processed_records_employee_date ON processed_records(employee_id, date);

-- Migração: campos CLT adicionais
ALTER TABLE processed_records 
  ADD COLUMN IF NOT EXISTS early_exit_seconds INTEGER DEFAULT 0;

ALTER TABLE processed_records 
  ADD COLUMN IF NOT EXISTS balance_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN processed_records.early_exit_seconds IS 'Saída antecipada em segundos (conforme CLT)';
COMMENT ON COLUMN processed_records.balance_seconds IS 'Saldo do dia em segundos: (hora_extra + chegada_antecipada) - (atraso + saida_antecipada)';

-- Migração: campo status (idempotente)
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
        UPDATE processed_records SET status = 'OK' WHERE status IS NULL;
    END IF;
END $$;

-- Migração: campo occurrence_type (idempotente)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
          AND column_name = 'occurrence_type'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_type TEXT 
        CHECK (occurrence_type IN ('FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO'));
    END IF;
END $$;

-- Migração: campos occurrence_hours_minutes e occurrence_duration (idempotente)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
          AND column_name = 'occurrence_hours_minutes'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_hours_minutes INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
          AND column_name = 'occurrence_duration'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_duration TEXT 
        CHECK (occurrence_duration IN ('COMPLETA', 'MEIO_PERIODO') OR occurrence_duration IS NULL);
    END IF;
END $$;

-- Migração: campos occurrence por batida (idempotente)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
          AND column_name = 'occurrence_morning_entry'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_morning_entry BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
          AND column_name = 'occurrence_lunch_exit'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_lunch_exit BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
          AND column_name = 'occurrence_afternoon_entry'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_afternoon_entry BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'processed_records' 
          AND column_name = 'occurrence_final_exit'
    ) THEN
        ALTER TABLE processed_records 
        ADD COLUMN occurrence_final_exit BOOLEAN DEFAULT false;
    END IF;
END $$;



