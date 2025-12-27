/**
 * Verificar dia 5 da Dayana
 */

import { queryOne } from '../infrastructure/database';
import { computeDaySummaryV2 } from '../domain/time-calculation';

async function main() {
  // Buscar Dayana
  const dayana = await queryOne<{ id: number; name: string }>(
    `SELECT id, name FROM employees WHERE name LIKE '%Dayana%' LIMIT 1`
  );
  
  if (!dayana) {
    console.log('❌ Dayana não encontrada');
    return;
  }
  
  // Buscar escala de sexta (day_of_week = 5)
  const schedule = await queryOne<{
    morning_start: string | null;
    morning_end: string | null;
    afternoon_start: string | null;
    afternoon_end: string | null;
  }>(
    `SELECT morning_start, morning_end, afternoon_start, afternoon_end 
     FROM work_schedules 
     WHERE employee_id = $1 AND day_of_week = 5`,
    [dayana.id]
  );
  
  if (!schedule) {
    console.log('❌ Escala de sexta não encontrada');
    return;
  }
  
  console.log('Escala de sexta-feira:');
  console.log(`  ${schedule.morning_start}-${schedule.morning_end} / ${schedule.afternoon_start}-${schedule.afternoon_end}\n`);
  
  // Buscar registro processado
  const processed = await queryOne<{
    morning_entry: string | null;
    lunch_exit: string | null;
    afternoon_entry: string | null;
    final_exit: string | null;
    expected_end: string | null;
    atraso_clt_minutes: number;
    extra_clt_minutes: number;
    saida_antec_clt_minutes: number;
    saldo_clt_minutes: number;
  }>(
    `SELECT morning_entry, lunch_exit, afternoon_entry, final_exit, expected_end,
            atraso_clt_minutes, extra_clt_minutes, saida_antec_clt_minutes, saldo_clt_minutes
     FROM processed_records 
     WHERE employee_id = $1 AND date = $2`,
    [dayana.id, '2025-12-05']
  );
  
  if (!processed) {
    console.log('❌ Registro processado não encontrado');
    return;
  }
  
  console.log('Batidas do dia 5:');
  console.log(`  Entrada: ${processed.morning_entry?.substring(11, 16)}`);
  console.log(`  Saída almoço: ${processed.lunch_exit?.substring(11, 16)}`);
  console.log(`  Entrada tarde: ${processed.afternoon_entry?.substring(11, 16)}`);
  console.log(`  Saída final: ${processed.final_exit?.substring(11, 16)}`);
  console.log(`  Expected End: ${processed.expected_end?.substring(11, 16)}\n`);
  
  console.log('Valores no banco:');
  console.log(`  ATRASO_CLT: ${processed.atraso_clt_minutes}min`);
  console.log(`  EXTRA_CLT: ${processed.extra_clt_minutes}min`);
  console.log(`  SAIDA_ANTEC_CLT: ${processed.saida_antec_clt_minutes}min`);
  console.log(`  SALDO_CLT: ${processed.saldo_clt_minutes}min\n`);
  
  // Recalcular para verificar
  const summary = computeDaySummaryV2(
    {
      morningEntry: processed.morning_entry,
      lunchExit: processed.lunch_exit,
      afternoonEntry: processed.afternoon_entry,
      finalExit: processed.final_exit,
    },
    {
      morningStart: schedule.morning_start,
      morningEnd: schedule.morning_end,
      afternoonStart: schedule.afternoon_start,
      afternoonEnd: schedule.afternoon_end,
    },
    '2025-12-05'
  );
  
  console.log('Valores recalculados:');
  console.log(`  ATRASO_CLT: ${summary.atrasoCltMinutes}min`);
  console.log(`  EXTRA_CLT: ${summary.extraCltMinutes}min`);
  console.log(`  SAIDA_ANTEC_CLT: ${summary.saidaAntecCltMinutes}min`);
  console.log(`  SALDO_CLT: ${summary.saldoCltMinutes}min\n`);
  
  if (summary.atrasoCltMinutes === processed.atraso_clt_minutes && 
      summary.extraCltMinutes === processed.extra_clt_minutes &&
      summary.saldoCltMinutes === processed.saldo_clt_minutes) {
    console.log('✅ Valores estão corretos!');
  } else {
    console.log('❌ Valores não coincidem!');
  }
}

main().catch(console.error);






