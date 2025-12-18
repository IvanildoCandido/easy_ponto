-- Migração: Criar tabela calendar_events para feriados e DSR (Descanso Semanal Remunerado)
-- Permite configurar feriados que se aplicam a todos os funcionários
-- Permite configurar DSR que se aplica aos domingos

CREATE TABLE IF NOT EXISTS calendar_events (
  id serial PRIMARY KEY,
  date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('FERIADO', 'DSR')) DEFAULT 'FERIADO',
  description text,
  applies_to_all_employees boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, event_type)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);

-- Comentários para documentação
COMMENT ON TABLE calendar_events IS 'Eventos do calendário (feriados e DSR) que se aplicam a todos os funcionários';
COMMENT ON COLUMN calendar_events.date IS 'Data do evento (formato: YYYY-MM-DD)';
COMMENT ON COLUMN calendar_events.event_type IS 'Tipo do evento: FERIADO ou DSR';
COMMENT ON COLUMN calendar_events.description IS 'Descrição do evento (ex: "Natal", "DSR - Domingo")';
COMMENT ON COLUMN calendar_events.applies_to_all_employees IS 'Indica se o evento se aplica a todos os funcionários (sempre true para feriados e DSR)';

