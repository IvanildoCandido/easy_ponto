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
      const hostname = connectionString.match(/@([^:]+)/)?.[1] || 'desconhecido';
      console.error('\n💡 Dica: O DNS não conseguiu resolver o hostname.');
      console.error(`   Hostname: ${hostname}`);
      console.error('\n   Verifique:');
      console.error('   1. Acesse https://app.supabase.com e verifique se o projeto está ativo');
      console.error('   2. Vá em Project Settings > Database > Connection string');
      console.error('   3. Copie a connection string completa (formato: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres)');
      console.error('   4. Se a senha contém @, substitua por %40 na connection string');
      console.error('   5. Verifique sua conexão com a internet');
      console.error('   6. Verifique se há firewall bloqueando conexões PostgreSQL (porta 5432)');
      console.error('\n   Exemplo de connection string correta:');
      console.error('   postgresql://postgres:SUA_SENHA@db.jxailblhblgcmsmyokaq.supabase.co:5432/postgres');
    } else if (error.code === '28P01') {
      console.error('\n💡 Dica: Erro de autenticação.');
      console.error('   Verifique:');
      console.error('   1. Se a senha está correta');
      console.error('   2. Se o @ na senha está escapado como %40');
      console.error('   3. Obtenha a senha atual em: Project Settings > Database > Database password');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('\n💡 Dica: Timeout ou conexão recusada.');
      console.error('   Verifique:');
      console.error('   1. Se o projeto Supabase está ativo (não pausado)');
      console.error('   2. Se há firewall bloqueando a porta 5432');
      console.error('   3. Sua conexão com a internet');
    }
    
    pool.end();
    process.exit(1);
  });

