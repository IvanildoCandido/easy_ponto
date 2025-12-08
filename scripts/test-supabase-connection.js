const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Ler .env.local manualmente
let connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/SUPABASE_DB_URL=(.+)/);
    if (match) {
      connectionString = match[1].replace(/^["']|["']$/g, ''); // Remove aspas se houver
    }
  } catch (error) {
    console.error('Erro ao ler .env.local:', error.message);
  }
}

console.log('🔍 Testando conexão com Supabase...');
console.log('URL (ocultando senha):', connectionString ? connectionString.replace(/:[^:@]+@/, ':****@') : 'NÃO DEFINIDA');

if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL não está definida no .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
});

pool.query('SELECT NOW() as current_time, COUNT(*) as employee_count FROM employees')
  .then((result) => {
    console.log('✅ Conexão bem-sucedida!');
    console.log('Hora do servidor:', result.rows[0].current_time);
    console.log('Total de funcionários:', result.rows[0].employee_count);
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na conexão:');
    console.error('Código:', error.code);
    console.error('Mensagem:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Dica: O DNS não conseguiu resolver o hostname.');
      console.error('   Verifique:');
      console.error('   1. Sua conexão com a internet');
      console.error('   2. Se o hostname está correto:', connectionString.match(/@([^:]+)/)?.[1]);
      console.error('   3. Se há firewall bloqueando');
    } else if (error.code === '28P01') {
      console.error('\n💡 Dica: Erro de autenticação.');
      console.error('   Verifique se a senha está correta e se o @ está escapado como %40');
    }
    
    pool.end();
    process.exit(1);
  });

