import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Sistema de banco de dados adaptativo:
 * - Desenvolvimento: SQLite (local, rápido, sem dependência de rede)
 * - Produção: Supabase/Postgres (via variável SUPABASE_DB_URL)
 */

const isProduction = process.env.NODE_ENV === 'production';
const useSupabase = isProduction && process.env.SUPABASE_DB_URL;

let sqliteDb: Database.Database | null = null;
let pgPool: any = null;

// Inicializar SQLite para desenvolvimento
if (!useSupabase) {
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
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, day_of_week)
    );

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
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE(employee_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON time_records(employee_id, datetime);
    CREATE INDEX IF NOT EXISTS idx_processed_records_employee_date ON processed_records(employee_id, date);
    
    -- Migração: adicionar campo status se não existir (para bancos existentes)
    -- SQLite não suporta ALTER TABLE ADD COLUMN IF NOT EXISTS, então usamos try/catch
    -- Para Postgres, isso será tratado na migração
  `);
  
  // Adicionar campos novos se não existirem (SQLite)
  if (!useSupabase && sqliteDb) {
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
    ];
    
    for (const col of newColumns) {
      try {
        sqliteDb.exec(`ALTER TABLE processed_records ADD COLUMN ${col.name} ${col.type}`);
        console.log(`[db] Campo ${col.name} adicionado à tabela processed_records`);
      } catch (error: any) {
        // Campo já existe, ignorar erro
        if (!error.message.includes('duplicate column')) {
          console.warn(`[db] Erro ao adicionar campo ${col.name}:`, error.message);
        }
      }
    }
  }

  console.log('[db] Usando SQLite (desenvolvimento)');
} else {
  // Inicializar Postgres para produção
  const { Pool } = require('pg');
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL não definida em produção');
  }

  pgPool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    statement_timeout: 60000,
  });

  console.log('[db] Usando Supabase/Postgres (produção)');
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
        throw new Error(`Erro de conexão com o banco de dados: ${error.message}. Verifique sua conexão com a internet e a URL do Supabase.`);
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
        throw new Error(`Erro de conexão com o banco de dados: ${error.message}. Verifique sua conexão com a internet e a URL do Supabase.`);
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
