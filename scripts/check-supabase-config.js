#!/usr/bin/env node
/**
 * Script para verificar e ajudar a configurar a connection string do Supabase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verificando configuração do Supabase...\n');

// Verificar se .env.local existe
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Arquivo .env.local não encontrado!');
  console.log('\n📝 Crie o arquivo .env.local na raiz do projeto com:');
  console.log('   SUPABASE_DB_URL=postgresql://postgres:[SENHA]@db.[PROJECT].supabase.co:5432/postgres\n');
  process.exit(1);
}

// Ler .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/SUPABASE_DB_URL=(.+)/);

if (!match) {
  console.error('❌ SUPABASE_DB_URL não encontrada no .env.local');
  console.log('\n📝 Adicione a linha:');
  console.log('   SUPABASE_DB_URL=postgresql://postgres:[SENHA]@db.[PROJECT].supabase.co:5432/postgres\n');
  process.exit(1);
}

const connectionString = match[1].replace(/^["']|["']$/g, '');

// Extrair informações da connection string
const urlMatch = connectionString.match(/postgresql?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!urlMatch) {
  console.error('❌ Formato da connection string inválido!');
  console.log('\n📝 Formato esperado:');
  console.log('   postgresql://postgres:[SENHA]@db.[PROJECT].supabase.co:5432/postgres');
  console.log('\n💡 Se a senha contém @, substitua por %40');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

console.log('✅ Connection string encontrada');
console.log(`   Usuário: ${user}`);
console.log(`   Host: ${host}`);
console.log(`   Porta: ${port}`);
console.log(`   Database: ${database}`);
console.log(`   Senha: ${'*'.repeat(password.length)}`);

// Verificar se o hostname parece correto
if (!host.includes('supabase.co')) {
  console.warn('\n⚠️  Aviso: O hostname não parece ser do Supabase');
  console.log('   Hostname esperado: db.[PROJECT].supabase.co');
}

// Testar resolução DNS
console.log('\n🔍 Testando resolução DNS...');
try {
  const nslookup = execSync(`nslookup ${host}`, { encoding: 'utf8', timeout: 5000 });
  if (nslookup.includes('Non-authoritative answer') || nslookup.includes('Name:')) {
    console.log('✅ DNS resolveu o hostname com sucesso');
  } else {
    console.warn('⚠️  DNS pode ter problemas');
  }
} catch (error) {
  console.error('❌ Erro ao resolver DNS:', error.message);
  console.log('\n💡 Possíveis causas:');
  console.log('   1. Problema de conexão com a internet');
  console.log('   2. Hostname incorreto');
  console.log('   3. Projeto Supabase pausado ou deletado');
  console.log('   4. Firewall bloqueando DNS');
}

// Instruções para obter a connection string correta
console.log('\n📋 Para obter a connection string correta:');
console.log('   1. Acesse https://app.supabase.com');
console.log('   2. Selecione seu projeto');
console.log('   3. Vá em Project Settings > Database');
console.log('   4. Role até "Connection string"');
console.log('   5. Selecione "URI" ou "Connection pooling"');
console.log('   6. Copie a connection string');
console.log('   7. Se a senha contém @, substitua por %40');
console.log('   8. Cole no .env.local como: SUPABASE_DB_URL=[connection_string]');

console.log('\n🧪 Para testar a conexão, execute:');
console.log('   node scripts/test-supabase-connection.js\n');






