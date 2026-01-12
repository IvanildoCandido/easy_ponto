/**
 * Verificar todos os dias da Dayana
 */

import { query } from '../infrastructure/database';

async function main() {
  // Buscar Dayana
  const dayana = await query<{ id: number; name: string }>(
    `SELECT id, name FROM employees WHERE name LIKE '%Dayana%' LIMIT 1`
  );
  
  if (dayana.length === 0) {
    console.log('❌ Dayana não encontrada');
    return;
  }
  
  const employeeId = dayana[0].id;
  
  // Buscar todos os registros processados de dezembro
  const records = await query<{
    date: string;
    morning_entry: string | null;
    lunch_exit: string | null;
    afternoon_entry: string | null;
    final_exit: string | null;
    atraso_clt_minutes: number;
    extra_clt_minutes: number;
    saida_antec_clt_minutes: number;
    saldo_clt_minutes: number;
    status: string;
  }>(
    `SELECT date, morning_entry, lunch_exit, afternoon_entry, final_exit,
            atraso_clt_minutes, extra_clt_minutes, saida_antec_clt_minutes, saldo_clt_minutes, status
     FROM processed_records 
     WHERE employee_id = $1 AND date >= '2025-12-05' AND date <= '2025-12-12'
     ORDER BY date DESC`,
    [employeeId]
  );
  
  console.log(`📊 Registros encontrados: ${records.length}\n`);
  
  for (const rec of records) {
    const date = rec.date.substring(8, 10) + '/' + rec.date.substring(5, 7) + '/' + rec.date.substring(0, 4);
    console.log(`📅 ${date}:`);
    console.log(`   Batidas: ${rec.morning_entry?.substring(11, 16) || '-'} / ${rec.lunch_exit?.substring(11, 16) || '-'} / ${rec.afternoon_entry?.substring(11, 16) || '-'} / ${rec.final_exit?.substring(11, 16) || '-'}`);
    console.log(`   ATRASO_CLT: ${rec.atraso_clt_minutes > 0 ? rec.atraso_clt_minutes + 'min' : '-'}`);
    console.log(`   EXTRA_CLT: ${rec.extra_clt_minutes > 0 ? rec.extra_clt_minutes + 'min' : '-'}`);
    console.log(`   SALDO_CLT: ${rec.saldo_clt_minutes > 0 ? rec.saldo_clt_minutes + 'min+' : rec.saldo_clt_minutes < 0 ? Math.abs(rec.saldo_clt_minutes) + 'min-' : '0min'}`);
    console.log(`   Status: ${rec.status}`);
    console.log('');
  }
}

main().catch(console.error);










