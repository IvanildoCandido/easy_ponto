/**
 * Script para rastrear EXATAMENTE onde o cálculo está sendo feito
 */

import { query } from '../lib/db';
import { computeDaySummaryV2, PunchTimes, ScheduledTimes } from '../lib/calculation-core-v2';

async function traceMarizelma() {
  console.log('🔍 RASTREANDO CÁLCULO DA MARIZELMA\n');

  // 1. Buscar batidas
  const punches = await query<any[]>(`
    SELECT datetime, in_out
    FROM time_records tr
    JOIN employees e ON tr.employee_id = e.id
    WHERE e.name LIKE '%Marizelma%' 
      AND tr.datetime LIKE '2025-12-05%'
    ORDER BY tr.datetime
  `);

  console.log('📋 TODAS as batidas no banco:');
  punches.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.datetime} (in_out: ${p.in_out})`);
  });

  // 2. Agrupar por hora:minuto (como o código faz)
  const timeGroups = new Map<string, any[]>();
  for (const record of punches) {
    const timeKey = record.datetime.substring(0, 16); // "2025-12-05 06:55"
    if (!timeGroups.has(timeKey)) {
      timeGroups.set(timeKey, []);
    }
    timeGroups.get(timeKey)!.push(record);
  }

  console.log('\n📊 Agrupamento por hora:minuto:');
  for (const [timeKey, records] of timeGroups.entries()) {
    console.log(`  ${timeKey}: ${records.length} batida(s)`);
    records.forEach((r, i) => {
      console.log(`    ${i + 1}. ${r.datetime}`);
    });
  }

  // 3. Pegar primeira de cada grupo
  const uniqueByTime: any[] = [];
  for (const [timeKey, records] of timeGroups.entries()) {
    const sorted = records.sort((a, b) => 
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
    uniqueByTime.push(sorted[0]);
  }

  uniqueByTime.sort((a, b) => 
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  console.log('\n✅ Batidas únicas selecionadas (primeira de cada grupo):');
  uniqueByTime.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.datetime}`);
  });

  // 4. Preparar para cálculo
  const punchTimes: PunchTimes = {
    morningEntry: uniqueByTime[0]?.datetime || null,
    lunchExit: uniqueByTime[1]?.datetime || null,
    afternoonEntry: uniqueByTime[2]?.datetime || null,
    finalExit: uniqueByTime[3]?.datetime || null,
  };

  console.log('\n🔢 Dados que serão passados para computeDaySummaryV2:');
  console.log('  morningEntry:', punchTimes.morningEntry);
  console.log('  lunchExit:', punchTimes.lunchExit);
  console.log('  afternoonEntry:', punchTimes.afternoonEntry);
  console.log('  finalExit:', punchTimes.finalExit);

  // 5. Calcular manualmente para verificar
  if (punchTimes.morningEntry && punchTimes.lunchExit) {
    const entry = new Date(punchTimes.morningEntry);
    const exit = new Date(punchTimes.lunchExit);
    const diffMs = exit.getTime() - entry.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    console.log(`\n📐 CÁLCULO MANUAL MANHÃ:`);
    console.log(`  ${punchTimes.morningEntry} -> ${punchTimes.lunchExit}`);
    console.log(`  Diferença: ${diffSeconds}s = ${diffMinutes}min`);
  }

  if (punchTimes.afternoonEntry && punchTimes.finalExit) {
    const entry = new Date(punchTimes.afternoonEntry);
    const exit = new Date(punchTimes.finalExit);
    const diffMs = exit.getTime() - entry.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    console.log(`\n📐 CÁLCULO MANUAL TARDE:`);
    console.log(`  ${punchTimes.afternoonEntry} -> ${punchTimes.finalExit}`);
    console.log(`  Diferença: ${diffSeconds}s = ${diffMinutes}min`);
  }

  // 6. Buscar escala
  const schedule = await query<any>(`
    SELECT ws.*
    FROM work_schedules ws
    JOIN employees e ON ws.employee_id = e.id
    WHERE e.name LIKE '%Marizelma%' 
      AND ws.day_of_week = 5
  `);

  const scheduledTimes: ScheduledTimes = {
    morningStart: schedule?.[0]?.morning_start || null,
    morningEnd: schedule?.[0]?.morning_end || null,
    afternoonStart: schedule?.[0]?.afternoon_start || null,
    afternoonEnd: schedule?.[0]?.afternoon_end || null,
  };

  // 7. Calcular usando a função
  console.log('\n⚙️ Executando computeDaySummaryV2...');
  const summary = computeDaySummaryV2(punchTimes, scheduledTimes, '2025-12-05');

  console.log('\n📊 RESULTADO:');
  console.log(`  workedSeconds: ${summary.workedSeconds}`);
  console.log(`  workedMinutes: ${summary.workedMinutes}`);
  console.log(`  expectedMinutes: ${summary.expectedMinutes}`);
  console.log(`  balanceMinutes: ${summary.balanceMinutes}`);

  // 8. Verificar o que está salvo
  const saved = await query<any>(`
    SELECT pr.worked_minutes, pr.expected_minutes, pr.balance_seconds
    FROM processed_records pr
    JOIN employees e ON pr.employee_id = e.id
    WHERE e.name LIKE '%Marizelma%' 
      AND pr.date = '2025-12-05'
  `);

  if (saved && saved.length > 0) {
    console.log('\n💾 SALVO NO BANCO:');
    console.log(`  worked_minutes: ${saved[0].worked_minutes}`);
    console.log(`  expected_minutes: ${saved[0].expected_minutes}`);
  }
}

traceMarizelma();
