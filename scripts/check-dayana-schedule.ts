/**
 * Script para verificar a escala da Dayana no sábado
 */

import { query, queryOne } from '../infrastructure/database';

async function main() {
  console.log('🔍 Buscando funcionário Dayana...\n');
  
  // Buscar Dayana
  const dayana = await queryOne<{ id: number; name: string; en_no: number }>(
    `SELECT id, name, en_no FROM employees WHERE name LIKE '%Dayana%' LIMIT 1`
  );
  
  if (!dayana) {
    console.log('❌ Dayana não encontrada');
    return;
  }
  
  console.log(`✅ Funcionário encontrado: ${dayana.name} (ID: ${dayana.id}, EN_NO: ${dayana.en_no})\n`);
  
  // Buscar escala de sábado (day_of_week = 6)
  console.log('🔍 Buscando escala de sábado (day_of_week = 6)...\n');
  const schedule = await queryOne<{
    id: number;
    employee_id: number;
    day_of_week: number;
    morning_start: string | null;
    morning_end: string | null;
    afternoon_start: string | null;
    afternoon_end: string | null;
    shift_type: string | null;
    break_minutes: number | null;
  }>(
    `SELECT * FROM work_schedules WHERE employee_id = $1 AND day_of_week = 6`,
    [dayana.id]
  );
  
  if (!schedule) {
    console.log('❌ Escala de sábado não encontrada');
    return;
  }
  
  console.log('✅ Escala de sábado encontrada:');
  console.log(`  ID: ${schedule.id}`);
  console.log(`  Morning Start: ${schedule.morning_start || 'NULL'}`);
  console.log(`  Morning End: ${schedule.morning_end || 'NULL'}`);
  console.log(`  Afternoon Start: ${schedule.afternoon_start || 'NULL'}`);
  console.log(`  Afternoon End: ${schedule.afternoon_end || 'NULL'}`);
  console.log(`  Shift Type: ${schedule.shift_type || 'NULL'}`);
  console.log(`  Break Minutes: ${schedule.break_minutes || 'NULL'}\n`);
  
  // Verificar override para o dia 6/12/2025
  console.log('🔍 Buscando override para 2025-12-06...\n');
  const override = await queryOne<{
    id: number;
    employee_id: number;
    date: string;
    morning_start: string | null;
    morning_end: string | null;
    afternoon_start: string | null;
    afternoon_end: string | null;
    shift_type: string | null;
  }>(
    `SELECT * FROM schedule_overrides WHERE employee_id = $1 AND date = $2`,
    [dayana.id, '2025-12-06']
  );
  
  if (override) {
    console.log('⚠️  OVERRIDE encontrado para 2025-12-06:');
    console.log(`  Morning Start: ${override.morning_start || 'NULL'}`);
    console.log(`  Morning End: ${override.morning_end || 'NULL'}`);
    console.log(`  Afternoon Start: ${override.afternoon_start || 'NULL'}`);
    console.log(`  Afternoon End: ${override.afternoon_end || 'NULL'}`);
    console.log(`  Shift Type: ${override.shift_type || 'NULL'}\n`);
  } else {
    console.log('✅ Nenhum override para 2025-12-06 (usando escala padrão)\n');
  }
  
  // Verificar registro processado para o dia 6
  console.log('🔍 Buscando registro processado para 2025-12-06...\n');
  const processed = await queryOne<{
    date: string;
    expected_end: string | null;
    atraso_clt_minutes: number;
    extra_clt_minutes: number;
    saida_antec_clt_minutes: number;
    saldo_clt_minutes: number;
  }>(
    `SELECT date, expected_end, atraso_clt_minutes, extra_clt_minutes, saida_antec_clt_minutes, saldo_clt_minutes 
     FROM processed_records 
     WHERE employee_id = $1 AND date = $2`,
    [dayana.id, '2025-12-06']
  );
  
  if (processed) {
    console.log('✅ Registro processado encontrado:');
    console.log(`  Expected End: ${processed.expected_end || 'NULL'}`);
    console.log(`  ATRASO_CLT: ${processed.atraso_clt_minutes}min`);
    console.log(`  EXTRA_CLT: ${processed.extra_clt_minutes}min`);
    console.log(`  SAIDA_ANTEC_CLT: ${processed.saida_antec_clt_minutes}min`);
    console.log(`  SALDO_CLT: ${processed.saldo_clt_minutes}min\n`);
  } else {
    console.log('❌ Registro processado não encontrado para 2025-12-06\n');
  }
}

main().catch(console.error);






