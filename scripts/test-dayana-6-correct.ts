/**
 * Teste com a escala CORRETA da Dayana no sábado
 */

import { computeDaySummaryV2 } from '../domain/time-calculation';

// Dia 6/12/2025 (SÁB) - Dayana
// Escala REAL: 08:00-11:30 / 12:30-15:00
// Batidas: 08:19 / 11:36 / 12:32 / 15:25

console.log('=== DAYANA - DIA 6/12/2025 COM ESCALA CORRETA ===\n');

const dayanaSchedule = {
  morningStart: '08:00',
  morningEnd: '11:30',
  afternoonStart: '12:30',
  afternoonEnd: '15:00',
};

const dayanaPunches = {
  morningEntry: '2025-12-06 08:19:00',
  lunchExit: '2025-12-06 11:36:00',
  afternoonEntry: '2025-12-06 12:32:00',
  finalExit: '2025-12-06 15:25:00',
};

const summary = computeDaySummaryV2(
  dayanaPunches,
  dayanaSchedule,
  '2025-12-06'
);

console.log('Resultado do cálculo:');
console.log(`  ATRASO_CLT: ${summary.atrasoCltMinutes}min (esperado: 14min)`);
console.log(`  EXTRA_CLT: ${summary.extraCltMinutes}min (esperado: 20min)`);
console.log(`  SAIDA_ANTEC_CLT: ${summary.saidaAntecCltMinutes}min (esperado: 0min)`);
console.log(`  SALDO_CLT: ${summary.saldoCltMinutes}min (esperado: 6min)`);
console.log(`  Excesso de Intervalo: ${summary.intervalExcessMinutes}min\n`);

if (summary.atrasoCltMinutes === 14 && summary.extraCltMinutes === 20 && summary.saldoCltMinutes === 6) {
  console.log('✅ TODOS OS VALORES ESTÃO CORRETOS!');
} else {
  console.log('❌ VALORES NÃO ESTÃO CORRETOS');
  console.log('\nLogs detalhados:');
  summary.logs.forEach(log => console.log(`  ${log}`));
}






