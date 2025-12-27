/**
 * Script para testar a query do PDF diretamente no banco
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnvFromFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Arquivo .env.local não encontrado');
    process.exit(1);
  }

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

async function main() {
  loadEnvFromFile();

  const supabaseUrl = process.env.SUPABASE_DB_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_DB_URL não definida');
  }

  console.log('🔄 Conectando ao Supabase...');

  const client = new Client({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Supabase\n');

    // Buscar funcionários
    const employees = await client.query('SELECT id, name, en_no FROM employees LIMIT 5');
    console.log(`Funcionários encontrados: ${employees.rows.length}`);
    employees.rows.forEach(emp => {
      console.log(`  - ID: ${emp.id}, Nome: ${emp.name}, EN_NO: ${emp.en_no}`);
    });

    if (employees.rows.length === 0) {
      console.log('\n⚠️  Nenhum funcionário encontrado!');
      await client.end();
      return;
    }

    const employeeId = employees.rows[0].id;
    console.log(`\n🔍 Testando com funcionário ID: ${employeeId} (${employees.rows[0].name})\n`);

    // Buscar registros processados
    const processedRecords = await client.query(`
      SELECT id, employee_id, date, status, worked_minutes
      FROM processed_records
      WHERE employee_id = $1
      ORDER BY date DESC
      LIMIT 10
    `, [employeeId]);

    console.log(`Registros processados encontrados: ${processedRecords.rows.length}`);
    processedRecords.rows.forEach(rec => {
      console.log(`  - Data: ${rec.date} (tipo: ${typeof rec.date}), Status: ${rec.status}, Trabalhado: ${rec.worked_minutes}min`);
    });

    if (processedRecords.rows.length === 0) {
      console.log('\n⚠️  Nenhum registro processado encontrado para este funcionário!');
      await client.end();
      return;
    }

    // Testar query do PDF
    const firstRecord = processedRecords.rows[0];
    const dateObj = firstRecord.date instanceof Date ? firstRecord.date : new Date(firstRecord.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(year, parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    console.log(`\n📅 Testando query do PDF para mês: ${year}-${month}`);
    console.log(`   Start: ${startDate}, End: ${endDate}\n`);

    const pdfQuery = await client.query(`
      SELECT 
        pr.id,
        pr.employee_id,
        pr.date,
        pr.morning_entry,
        pr.lunch_exit,
        pr.afternoon_entry,
        pr.final_exit,
        pr.status,
        COALESCE(pr.occurrence_type, NULL) as occurrence_type,
        e.name as employee_name,
        e.department
      FROM processed_records pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE pr.employee_id = $1 
        AND pr.date >= $2
        AND pr.date <= $3
      ORDER BY pr.date ASC
    `, [employeeId, startDate, endDate]);

    console.log(`✅ Query do PDF retornou: ${pdfQuery.rows.length} registros\n`);
    pdfQuery.rows.forEach(rec => {
      console.log(`  - Data: ${rec.date} (tipo: ${typeof rec.date}), Funcionário: ${rec.employee_name}`);
      console.log(`    Entrada: ${rec.morning_entry || '-'}, Saída: ${rec.final_exit || '-'}`);
    });

    await client.end();
    console.log('\n✅ Teste concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

main();










