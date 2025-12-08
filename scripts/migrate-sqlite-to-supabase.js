/**
 * Migração de dados do SQLite local para o Supabase/Postgres.
 * Passos:
 * 1) Limpa as tabelas no Supabase (TRUNCATE CASCADE).
 * 2) Lê o SQLite local e insere no Supabase preservando en_no.
 *
 * Requisitos:
 * - Variável de ambiente SUPABASE_DB_URL (ou .env.local com ela).
 * - Banco SQLite em database/easy_ponto.db.
 *
 * Uso: node scripts/migrate-sqlite-to-supabase.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Client } = require('pg');

function loadEnvFromFile() {
  if (process.env.SUPABASE_DB_URL) return;
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) return;
      const key = line.substring(0, eqIdx).trim();
      let value = line.substring(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  loadEnvFromFile();

  const supabaseUrl = process.env.SUPABASE_DB_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_DB_URL não definida. Configure o .env.local ou a variável de ambiente.');
  }

  const sqlitePath = path.join(process.cwd(), 'database', 'easy_ponto.db');
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite não encontrado em ${sqlitePath}`);
  }

  console.log('🔄 Iniciando migração do SQLite para Supabase...');

  const sqlite = new Database(sqlitePath, { readonly: true });
  const pg = new Client({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  try {
    await pg.query('BEGIN');

    console.log('🧹 Limpando tabelas no Supabase (truncate cascade)...');
    await pg.query('TRUNCATE time_records, processed_records, work_schedules, employees RESTART IDENTITY CASCADE;');

    // Carregar dados do SQLite
    const employees = sqlite.prepare('SELECT id, en_no, name, department, created_at FROM employees').all();
    const schedules = sqlite.prepare(`
      SELECT ws.*, e.en_no 
      FROM work_schedules ws 
      JOIN employees e ON ws.employee_id = e.id
    `).all();
    const timeRecords = sqlite.prepare(`
      SELECT tr.*, e.en_no 
      FROM time_records tr 
      JOIN employees e ON tr.employee_id = e.id
      ORDER BY tr.datetime
    `).all();
    const processedRecords = sqlite.prepare(`
      SELECT pr.*, e.en_no 
      FROM processed_records pr 
      JOIN employees e ON pr.employee_id = e.id
      ORDER BY pr.date
    `).all();

    console.log(`👥 Employees: ${employees.length}`);
    console.log(`🗓️  Work schedules: ${schedules.length}`);
    console.log(`⏱️  Time records: ${timeRecords.length}`);
    console.log(`📊 Processed records: ${processedRecords.length}`);

    // Inserir employees e mapear en_no -> novo id
    const enNoToId = new Map();
    const employeeChunks = chunkArray(employees, 200);
    for (const chunk of employeeChunks) {
      const values = [];
      const params = [];
      chunk.forEach((emp, idx) => {
        const base = idx * 4;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
        params.push(emp.en_no, emp.name, emp.department || null, emp.created_at || null);
      });
      const res = await pg.query(
        `INSERT INTO employees (en_no, name, department, created_at) VALUES ${values.join(', ')} RETURNING en_no, id`,
        params
      );
      res.rows.forEach(row => enNoToId.set(row.en_no, row.id));
    }

    // Schedules
    const scheduleChunks = chunkArray(schedules, 200);
    for (const chunk of scheduleChunks) {
      const values = [];
      const params = [];
      chunk.forEach((sc, idx) => {
        const empId = enNoToId.get(sc.en_no);
        if (!empId) return;
        const base = idx * 6;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
        params.push(
          empId,
          sc.day_of_week,
          sc.morning_start || null,
          sc.morning_end || null,
          sc.afternoon_start || null,
          sc.afternoon_end || null
        );
      });
      if (values.length > 0) {
        await pg.query(
          `
            INSERT INTO work_schedules 
              (employee_id, day_of_week, morning_start, morning_end, afternoon_start, afternoon_end)
            VALUES ${values.join(', ')}
          `,
          params
        );
      }
    }

    // Time records
    const timeChunks = chunkArray(timeRecords, 200);
    for (const chunk of timeChunks) {
      const values = [];
      const params = [];
      chunk.forEach((tr, idx) => {
        const empId = enNoToId.get(tr.en_no);
        if (!empId) return;
        const base = idx * 8;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`);
        params.push(
          empId,
          tr.record_no || null,
          tr.tm_no || null,
          tr.mode || null,
          tr.in_out,
          tr.vm || null,
          tr.department || null,
          tr.datetime
        );
      });
      if (values.length > 0) {
        await pg.query(
          `
            INSERT INTO time_records 
              (employee_id, record_no, tm_no, mode, in_out, vm, department, datetime)
            VALUES ${values.join(', ')}
          `,
          params
        );
      }
    }

    // Processed records
    const processedChunks = chunkArray(processedRecords, 200);
    for (const chunk of processedChunks) {
      const values = [];
      const params = [];
      chunk.forEach((pr, idx) => {
        const empId = enNoToId.get(pr.en_no);
        if (!empId) return;
        const base = idx * 24;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}, $${base + 20}, $${base + 21}, $${base + 22}, $${base + 23}, $${base + 24})`);
        params.push(
          empId,
          pr.date,
          pr.first_entry || null,
          pr.last_exit || null,
          pr.morning_entry || null,
          pr.lunch_exit || null,
          pr.afternoon_entry || null,
          pr.final_exit || null,
          pr.expected_start || null,
          pr.expected_end || null,
          pr.delay_seconds || 0,
          pr.early_arrival_seconds || 0,
          pr.overtime_seconds || 0,
          pr.early_exit_seconds || 0,
          pr.worked_minutes || 0,
          pr.expected_minutes || 0,
          pr.balance_seconds || 0,
          pr.interval_excess_seconds || 0,
          pr.atraso_clt_minutes || 0,
          pr.chegada_antec_clt_minutes || 0,
          pr.extra_clt_minutes || 0,
          pr.saida_antec_clt_minutes || 0,
          pr.saldo_clt_minutes || 0,
          pr.status || 'OK'
        );
      });
      if (values.length > 0) {
        await pg.query(
          `
            INSERT INTO processed_records 
              (employee_id, date, first_entry, last_exit, morning_entry, lunch_exit, afternoon_entry, final_exit,
               expected_start, expected_end, delay_seconds, early_arrival_seconds, overtime_seconds, early_exit_seconds,
               worked_minutes, expected_minutes, balance_seconds, interval_excess_seconds,
               atraso_clt_minutes, chegada_antec_clt_minutes, extra_clt_minutes, saida_antec_clt_minutes, saldo_clt_minutes, status)
            VALUES ${values.join(', ')}
          `,
          params
        );
      }
    }

    await pg.query('COMMIT');
    console.log('✅ Migração concluída com sucesso.');
  } catch (error) {
    await pg.query('ROLLBACK');
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    await pg.end();
    sqlite.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


