/**
 * Script para aplicar a migração do campo occurrence_type no Supabase
 * 
 * Uso: node scripts/apply-occurrence-type-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function main() {
  loadEnvFromFile();

  const supabaseUrl = process.env.SUPABASE_DB_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_DB_URL não definida. Configure o .env.local ou a variável de ambiente.');
  }

  console.log('🔄 Aplicando migração do campo occurrence_type...');

  const pg = new Client({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pg.connect();
    console.log('✅ Conectado ao Supabase');

    // Ler o arquivo de migração
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_occurrence_type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executando migração...');
    await pg.query(migrationSQL);

    // Verificar se a coluna foi criada
    const result = await pg.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'processed_records' 
        AND column_name = 'occurrence_type'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Campo occurrence_type adicionado com sucesso!');
      console.log(`   Tipo: ${result.rows[0].data_type}`);
    } else {
      console.log('⚠️  Migração executada, mas a coluna não foi encontrada. Pode já existir.');
    }

    console.log('✅ Migração concluída!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  A coluna já existe. Nenhuma ação necessária.');
    } else {
      throw error;
    }
  } finally {
    await pg.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});










