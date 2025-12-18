/**
 * Sistema de banco de dados adaptativo:
 * - Desenvolvimento: SQLite (local, rápido, sem dependência de rede)
 * - Produção: Supabase/Postgres (via variável SUPABASE_DB_URL)
 */

import path from 'path';
import fs from 'fs';
import { logger } from './logger';

// Detectar se deve usar Supabase baseado na existência da variável SUPABASE_DB_URL
// Se a variável estiver definida, usa Supabase independente do ambiente
// Isso permite usar Supabase em desenvolvimento local também
const useSupabase = !!process.env.SUPABASE_DB_URL;

let sqliteDb: any = null;
let pgPool: any = null;

// Inicializar SQLite para desenvolvimento
if (!useSupabase) {
  // Importar better-sqlite3 apenas em desenvolvimento para evitar problemas na Vercel
  const Database = require('better-sqlite3');
  const dbPath = path.join(process.cwd(), 'database', 'easy_ponto.db');
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');

  // Criar tabelas se não existirem
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      en_no INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      compensation_type TEXT CHECK(compensation_type IN ('BANCO_DE_HORAS', 'PAGAMENTO_FOLHA')) DEFAULT 'BANCO_DE_HORAS',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 1 AND day_of_week <= 6),
      morning_start TEXT,
      morning_end TEXT,
      afternoon_start TEXT,
      afternoon_end TEXT,
      shift_type TEXT CHECK(shift_type IN ('FULL_DAY', 'MORNING_ONLY', 'AFTERNOON_ONLY')),
      break_minutes INTEGER DEFAULT NULL,
      interval_tolerance_minutes INTEGER DEFAULT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS schedule_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      morning_start TEXT,
      morning_end TEXT,
      afternoon_start TEXT,
      afternoon_end TEXT,
      shift_type TEXT CHECK(shift_type IN ('FULL_DAY', 'MORNING_ONLY', 'AFTERNOON_ONLY')),
      break_minutes INTEGER DEFAULT NULL,
      interval_tolerance_minutes INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_overrides_employee_date ON schedule_overrides(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(date);

    CREATE TABLE IF NOT EXISTS time_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      record_no INTEGER,
      tm_no INTEGER,
      mode INTEGER,
      in_out INTEGER NOT NULL,
      vm TEXT,
      department TEXT,
      datetime TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS processed_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      first_entry TEXT,
      last_exit TEXT,
      morning_entry TEXT,
      lunch_exit TEXT,
      afternoon_entry TEXT,
      final_exit TEXT,
      expected_start TEXT,
      expected_end TEXT,
      delay_seconds INTEGER DEFAULT 0,
      early_arrival_seconds INTEGER DEFAULT 0,
      overtime_seconds INTEGER DEFAULT 0,
      early_exit_seconds INTEGER DEFAULT 0,
      worked_minutes INTEGER DEFAULT 0,
      expected_minutes INTEGER DEFAULT 0,
      balance_seconds INTEGER DEFAULT 0,
      interval_excess_seconds INTEGER DEFAULT 0,
      atraso_clt_minutes INTEGER DEFAULT 0,
      chegada_antec_clt_minutes INTEGER DEFAULT 0,
      extra_clt_minutes INTEGER DEFAULT 0,
      saida_antec_clt_minutes INTEGER DEFAULT 0,
      saldo_clt_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'OK',
      occurrence_type TEXT,
      occurrence_hours_minutes INTEGER,
      occurrence_duration TEXT,
      occurrence_morning_entry INTEGER DEFAULT 0,
      occurrence_lunch_exit INTEGER DEFAULT 0,
      occurrence_afternoon_entry INTEGER DEFAULT 0,
      occurrence_final_exit INTEGER DEFAULT 0,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    );

    CREATE TABLE IF NOT EXISTS manual_punch_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      morning_entry TEXT,
      lunch_exit TEXT,
      afternoon_entry TEXT,
      final_exit TEXT,
      corrected_by TEXT,
      correction_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_manual_punch_corrections_employee_date ON manual_punch_corrections(employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_manual_punch_corrections_date ON manual_punch_corrections(date);

    CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON time_records(employee_id, datetime);
    CREATE INDEX IF NOT EXISTS idx_processed_records_employee_date ON processed_records(employee_id, date);

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('FERIADO', 'DSR')) DEFAULT 'FERIADO',
      description TEXT,
      applies_to_all_employees INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, event_type)
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
  `);
  
  // Adicionar campos novos em work_schedules se não existirem (SQLite)
  try {
    sqliteDb.exec(`
      ALTER TABLE work_schedules ADD COLUMN shift_type TEXT CHECK(shift_type IN ('FULL_DAY', 'MORNING_ONLY', 'AFTERNOON_ONLY'));
    `);
  } catch (e: any) {
    // Coluna já existe, ignorar erro
  }
  
  try {
    sqliteDb.exec(`
      ALTER TABLE work_schedules ADD COLUMN break_minutes INTEGER DEFAULT NULL;
    `);
  } catch (e: any) {
    // Coluna já existe, ignorar erro
  }
  
  try {
    sqliteDb.exec(`
      ALTER TABLE work_schedules ADD COLUMN interval_tolerance_minutes INTEGER DEFAULT NULL;
    `);
  } catch (e: any) {
    // Coluna já existe, ignorar erro
  }
  
  try {
    sqliteDb.exec(`
      ALTER TABLE employees ADD COLUMN compensation_type TEXT CHECK(compensation_type IN ('BANCO_DE_HORAS', 'PAGAMENTO_FOLHA')) DEFAULT 'BANCO_DE_HORAS';
    `);
  } catch (e: any) {
    // Coluna já existe, ignorar erro
  }
  
  // Atualizar registros existentes para FULL_DAY (compatibilidade retroativa)
  try {
    sqliteDb.exec(`
      UPDATE work_schedules SET shift_type = 'FULL_DAY' WHERE shift_type IS NULL;
    `);
  } catch (e: any) {
    // Ignorar erro
  }
  
  // Adicionar campos novos se não existirem (SQLite)
  const newColumns = [
    { name: 'status', type: 'TEXT DEFAULT \'OK\'' },
    { name: 'early_exit_seconds', type: 'INTEGER DEFAULT 0' },
    { name: 'balance_seconds', type: 'INTEGER DEFAULT 0' },
    { name: 'expected_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'interval_excess_seconds', type: 'INTEGER DEFAULT 0' },
    { name: 'atraso_clt_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'chegada_antec_clt_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'extra_clt_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'saida_antec_clt_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'saldo_clt_minutes', type: 'INTEGER DEFAULT 0' },
    { name: 'occurrence_type', type: 'TEXT' },
    { name: 'occurrence_hours_minutes', type: 'INTEGER' },
    { name: 'occurrence_duration', type: 'TEXT' },
    { name: 'occurrence_morning_entry', type: 'INTEGER DEFAULT 0' },
    { name: 'occurrence_lunch_exit', type: 'INTEGER DEFAULT 0' },
    { name: 'occurrence_afternoon_entry', type: 'INTEGER DEFAULT 0' },
    { name: 'occurrence_final_exit', type: 'INTEGER DEFAULT 0' },
    { name: 'is_manual_morning_entry', type: 'INTEGER DEFAULT 0' },
    { name: 'is_manual_lunch_exit', type: 'INTEGER DEFAULT 0' },
    { name: 'is_manual_afternoon_entry', type: 'INTEGER DEFAULT 0' },
    { name: 'is_manual_final_exit', type: 'INTEGER DEFAULT 0' },
  ];
  
  for (const col of newColumns) {
    try {
      sqliteDb.exec(`ALTER TABLE processed_records ADD COLUMN ${col.name} ${col.type}`);
    } catch (error: any) {
      // Campo já existe, ignorar erro
      if (!error.message.includes('duplicate column')) {
        logger.warn(`[db] Erro ao adicionar campo ${col.name}:`, error.message);
      }
    }
  }

  logger.info('[db] Usando SQLite (desenvolvimento)');
} else {
  // Inicializar Postgres para produção
  const { Pool } = require('pg');
  let connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL não definida em produção');
  }

  // Validar e processar connection string
  try {
    if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
      throw new Error('SUPABASE_DB_URL deve começar com postgresql:// ou postgres://');
    }

    // Extrair e validar hostname
    const hostMatch = connectionString.match(/@([^:]+):/);
    if (hostMatch) {
      const hostname = hostMatch[1];
    }
  } catch (error: any) {
    logger.error('[db] Erro ao validar SUPABASE_DB_URL:', error.message);
    throw error;
  }

  pgPool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    statement_timeout: 60000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Testar conexão na inicialização
  pgPool.query('SELECT 1 as test')
    .then(() => {
      logger.info('[db] Conexão com Supabase/Postgres estabelecida com sucesso');
    })
    .catch((error: any) => {
      logger.error('[db] Erro ao conectar ao Supabase:', error.message);
      logger.error('[db] Código do erro:', error.code);
      if (error.code === 'ENOTFOUND') {
        logger.error('[db] Problema de DNS. Verifique connection string e conexão com internet');
      }
      // Não inicializar SQLite em produção - falhar explicitamente
      throw new Error(`Não foi possível conectar ao Supabase: ${error.message}`);
    });

  logger.info('[db] Usando Supabase/Postgres (produção)');
}

// Função auxiliar para detectar se a query retorna dados (SELECT) ou não (INSERT/UPDATE/DELETE)
function isSelectQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
}

// Função auxiliar para converter SQL de Postgres para SQLite
function convertPostgresToSqlite(sql: string, params?: any[]): { sql: string; params?: any[] } {
  if (!useSupabase) {
    // Converter placeholders $1, $2, ... para ?
    let convertedSql = sql;
    const convertedParams: any[] = [];
    
    if (params && params.length > 0) {
      convertedSql = sql.replace(/\$(\d+)/g, (match, index) => {
        const paramIndex = parseInt(index) - 1;
        convertedParams.push(params[paramIndex]);
        return '?';
      });
    }
    
    // Remover ::text (casting do Postgres) para SQLite
    convertedSql = convertedSql.replace(/::text/gi, '');
    convertedSql = convertedSql.replace(/::integer/gi, '');
    convertedSql = convertedSql.replace(/::bigint/gi, '');
    convertedSql = convertedSql.replace(/::date/gi, '');
    
    // Converter EXTRACT(DOW FROM ...) do Postgres para strftime('%w', ...) do SQLite
    convertedSql = convertedSql.replace(
      /EXTRACT\(DOW FROM ([^)]+)\)/gi,
      (match, dateExpr) => `CAST(strftime('%w', ${dateExpr}) AS INTEGER)`
    );
    
    return { sql: convertedSql, params: convertedParams.length > 0 ? convertedParams : params };
  }
  
  return { sql, params };
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (useSupabase && pgPool) {
    try {
      const result = await pgPool.query(text, params);
      return result.rows as T[];
    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'EADDRNOTAVAIL' || error.code === 'EHOSTUNREACH') {
        const hostMatch = process.env.SUPABASE_DB_URL?.match(/@([^:]+):/);
        const hostname = hostMatch ? hostMatch[1] : 'desconhecido';
        throw new Error(
          `Erro de conexão com o banco de dados: ${error.message}\n` +
          `Hostname: ${hostname}\n` +
          `Verifique:\n` +
          `1. Se o projeto Supabase está ativo (https://app.supabase.com)\n` +
          `2. Se a connection string no .env.local está correta\n` +
          `3. Sua conexão com a internet\n` +
          `4. Execute: node scripts/test-supabase-connection.js para testar`
        );
      }
      throw error;
    }
  } else if (sqliteDb) {
    const { sql, params: convertedParams } = convertPostgresToSqlite(text, params);
    const stmt = sqliteDb.prepare(sql);
    
    // Para SELECT, usar .all(); para INSERT/UPDATE/DELETE, usar .run()
    if (isSelectQuery(sql)) {
      const result = stmt.all(...(convertedParams || []));
      return result as T[];
    } else {
      // DML queries (INSERT/UPDATE/DELETE) não retornam dados
      stmt.run(...(convertedParams || []));
      return [] as T[];
    }
  } else {
    throw new Error('Banco de dados não inicializado');
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  if (useSupabase && pgPool) {
    try {
      const result = await pgPool.query(text, params);
      return (result.rows[0] as T) ?? null;
    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'EADDRNOTAVAIL' || error.code === 'EHOSTUNREACH') {
        const hostMatch = process.env.SUPABASE_DB_URL?.match(/@([^:]+):/);
        const hostname = hostMatch ? hostMatch[1] : 'desconhecido';
        throw new Error(
          `Erro de conexão com o banco de dados: ${error.message}\n` +
          `Hostname: ${hostname}\n` +
          `Verifique:\n` +
          `1. Se o projeto Supabase está ativo (https://app.supabase.com)\n` +
          `2. Se a connection string no .env.local está correta\n` +
          `3. Sua conexão com a internet\n` +
          `4. Execute: node scripts/test-supabase-connection.js para testar`
        );
      }
      throw error;
    }
  } else if (sqliteDb) {
    const { sql, params: convertedParams } = convertPostgresToSqlite(text, params);
    const stmt = sqliteDb.prepare(sql);
    
    // Para SELECT, usar .get(); para INSERT/UPDATE/DELETE, usar .run()
    if (isSelectQuery(sql)) {
      const result = stmt.get(...(convertedParams || []));
      return (result as T) ?? null;
    } else {
      // DML queries (INSERT/UPDATE/DELETE) não retornam dados
      stmt.run(...(convertedParams || []));
      return null;
    }
  } else {
    throw new Error('Banco de dados não inicializado');
  }
}

// Exportar instância do banco para compatibilidade com código antigo
export const pool = useSupabase ? pgPool : {
  connect: async () => ({
    query: async (text: string, params?: any[]) => {
      const { sql, params: convertedParams } = convertPostgresToSqlite(text, params);
      const stmt = sqliteDb!.prepare(sql);
      
      // Para SELECT, usar .all(); para INSERT/UPDATE/DELETE, usar .run()
      if (isSelectQuery(sql)) {
        const result = stmt.all(...(convertedParams || []));
        return { rows: result };
      } else {
        stmt.run(...(convertedParams || []));
        return { rows: [] };
      }
    },
    release: () => {},
  }),
};

export default useSupabase ? pgPool : sqliteDb;
