/**
 * Script para debugar o cálculo da Marizelma
 * Execute: npx tsx scripts/debug-marizelma.ts
 */

import { query } from '../lib/db';
import { computeDaySummaryV2, PunchTimes, ScheduledTimes } from '../lib/calculation-core-v2';

async function debugMarizelma() {
  console.log('🔍 Debugando cálculo da Marizelma - 05/12/2025\n');

  try {
    // 1. Buscar batidas reais da Marizelma
    const punches = await query<any[]>(`
      SELECT datetime, in_out
      FROM time_records tr
      JOIN employees e ON tr.employee_id = e.id
      WHERE e.name LIKE '%Marizelma%' 
        AND tr.datetime LIKE '2025-12-05%'
      ORDER BY tr.datetime
    `);

    console.log('📋 Batidas encontradas no banco:');
    punches.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.datetime} (in_out: ${p.in_out})`);
    });

    // 2. Buscar escala da Marizelma para sexta-feira (dia 5 = sexta)
    const schedule = await query<any>(`
      SELECT ws.*
      FROM work_schedules ws
      JOIN employees e ON ws.employee_id = e.id
      WHERE e.name LIKE '%Marizelma%' 
        AND ws.day_of_week = 5
    `);

    console.log('\n📅 Escala cadastrada (sexta-feira):');
    if (schedule && schedule.length > 0) {
      const s = schedule[0];
      console.log(`  Manhã: ${s.morning_start || '-'} até ${s.morning_end || '-'}`);
      console.log(`  Tarde: ${s.afternoon_start || '-'} até ${s.afternoon_end || '-'}`);
    } else {
      console.log('  ⚠️ Nenhuma escala encontrada!');
    }

    // 3. Preparar dados para cálculo
    const sortedPunches = punches.sort((a, b) => 
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    const punchTimes: PunchTimes = {
      morningEntry: sortedPunches[0]?.datetime || null,
      lunchExit: sortedPunches[1]?.datetime || null,
      afternoonEntry: sortedPunches[2]?.datetime || null,
      finalExit: sortedPunches[3]?.datetime || null,
    };

    const scheduledTimes: ScheduledTimes = {
      morningStart: schedule?.[0]?.morning_start || null,
      morningEnd: schedule?.[0]?.morning_end || null,
      afternoonStart: schedule?.[0]?.afternoon_start || null,
      afternoonEnd: schedule?.[0]?.afternoon_end || null,
    };

    console.log('\n🔢 Dados preparados para cálculo:');
    console.log('  Entrada manhã:', punchTimes.morningEntry);
    console.log('  Saída almoço:', punchTimes.lunchExit);
    console.log('  Entrada tarde:', punchTimes.afternoonEntry);
    console.log('  Saída final:', punchTimes.finalExit);

    // 4. Calcular
    console.log('\n⚙️ Executando cálculo...');
    const summary = computeDaySummaryV2(punchTimes, scheduledTimes, '2025-12-05');

    console.log('\n📊 RESULTADO DO CÁLCULO:');
    console.log(`  Horas trabalhadas: ${summary.workedMinutes}min (${summary.workedSeconds}s)`);
    console.log(`  Horas previstas: ${summary.expectedMinutes}min (${summary.expectedSeconds}s)`);
    console.log(`  Saldo: ${summary.balanceMinutes}min (${summary.balanceSeconds}s)`);
    console.log(`  Status: ${summary.status}`);

    // 5. Verificar o que está salvo no banco
    const saved = await query<any>(`
      SELECT pr.worked_minutes, pr.expected_minutes, pr.balance_seconds
      FROM processed_records pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE e.name LIKE '%Marizelma%' 
        AND pr.date = '2025-12-05'
    `);

    console.log('\n💾 DADOS SALVOS NO BANCO:');
    if (saved && saved.length > 0) {
      const s = saved[0];
      console.log(`  worked_minutes: ${s.worked_minutes}`);
      console.log(`  expected_minutes: ${s.expected_minutes}`);
      console.log(`  balance_seconds: ${s.balance_seconds}`);
      
      if (s.worked_minutes !== summary.workedMinutes) {
        console.log(`\n⚠️ DISCREPÂNCIA ENCONTRADA!`);
        console.log(`  Cálculo atual: ${summary.workedMinutes}min`);
        console.log(`  Banco salvo: ${s.worked_minutes}min`);
        console.log(`  Diferença: ${summary.workedMinutes - s.worked_minutes}min`);
      } else {
        console.log(`\n✅ Dados no banco estão corretos!`);
      }
    } else {
      console.log('  ⚠️ Nenhum registro processado encontrado!');
    }

    // 6. Logs detalhados
    console.log('\n📝 LOGS DETALHADOS DO CÁLCULO:');
    summary.logs.forEach(log => console.log(`  ${log}`));

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugMarizelma();


