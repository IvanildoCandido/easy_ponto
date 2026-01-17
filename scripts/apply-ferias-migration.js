/**
 * Script para aplicar a migration que adiciona 'FERIAS' ao CHECK constraint de occurrence_type
 * 
 * Requisitos:
 * - Variável de ambiente SUPABASE_DB_URL (ou .env.local com ela)
 * 
 * Uso: node scripts/apply-ferias-migration.js
 */

const fs = require('fs');
const path = require('path');
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

async function main() {
  loadEnvFromFile();

  const supabaseUrl = process.env.SUPABASE_DB_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_DB_URL não definida. Configure o .env.local ou a variável de ambiente.');
  }

  console.log('🔄 Aplicando migração para adicionar FERIAS ao constraint...');

  const pg = new Client({
    connectionString: supabaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pg.connect();
    console.log('✅ Conectado ao Supabase');

    // Ler o arquivo de migração
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_ferias.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executando migração...');
    await pg.query(migrationSQL);

    // Verificar se o constraint foi atualizado corretamente
    const result = await pg.query(`
      SELECT 
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'processed_records'
        AND con.conname LIKE '%occurrence_type%check%'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Constraint atualizado com sucesso!');
      console.log(`   Constraint: ${result.rows[0].constraint_name}`);
      console.log(`   Definição: ${result.rows[0].constraint_definition}`);
      
      // Verificar se FERIAS está na definição
      if (result.rows[0].constraint_definition.includes("'FERIAS'")) {
        console.log('✅ FERIAS confirmado no constraint!');
      } else {
        console.log('⚠️  FERIAS não encontrado no constraint. Verifique manualmente.');
      }
    } else {
      console.log('⚠️  Migração executada, mas o constraint não foi encontrado.');
    }

    console.log('✅ Migração concluída!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    console.error('   Detalhes:', error);
    throw error;
  } finally {
    await pg.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
