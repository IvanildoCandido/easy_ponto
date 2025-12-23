/**
 * Script para testar cálculos da Dayana
 */

import { computeDaySummaryV2 } from '../domain/time-calculation';

// Dia 5/12/2025 (SEX) - Dayana
// Batidas: 08:13 / 12:11 / 14:11 / 17:56
// Resultado esperado: ATRASO_CLT: 8min, H.EXTRA_CLT: -, SALDO_CLT: 8min-

console.log('=== DAYANA - DIA 5/12/2025 (SEX) ===\n');

const dayana5Schedule = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '14:00',
  afternoonEnd: '18:00',
};

const dayana5Punches = {
  morningEntry: '2025-12-05 08:13:00',
  lunchExit: '2025-12-05 12:11:00',
  afternoonEntry: '2025-12-05 14:11:00',
  finalExit: '2025-12-05 17:56:00',
};

const dayana5Summary = computeDaySummaryV2(
  dayana5Punches,
  dayana5Schedule,
  '2025-12-05'
);

console.log('Dia 5/12/2025:');
console.log(`  ATRASO_CLT: ${dayana5Summary.atrasoCltMinutes}min (esperado: 8min)`);
console.log(`  EXTRA_CLT: ${dayana5Summary.extraCltMinutes}min (esperado: 0min)`);
console.log(`  SALDO_CLT: ${dayana5Summary.saldoCltMinutes}min (esperado: -8min)`);
console.log(`  Excesso de Intervalo: ${dayana5Summary.intervalExcessMinutes}min`);
console.log('\nLogs:');
dayana5Summary.logs.forEach(log => console.log(`  ${log}`));

// Dia 6/12/2025 (SÁB) - Dayana
// Batidas: 08:19 / 11:36 / 12:32 / 15:25
// Resultado esperado: ATRASO_CLT: 14min, H.EXTRA_CLT: 20min, SALDO_CLT: 6min+

console.log('\n\n=== DAYANA - DIA 6/12/2025 (SÁB) ===\n');

const dayana6Schedule = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
};

const dayana6Punches = {
  morningEntry: '2025-12-06 08:19:00',
  lunchExit: '2025-12-06 11:36:00',
  afternoonEntry: '2025-12-06 12:32:00',
  finalExit: '2025-12-06 15:25:00',
};

const dayana6Summary = computeDaySummaryV2(
  dayana6Punches,
  dayana6Schedule,
  '2025-12-06'
);

console.log('Dia 6/12/2025:');
console.log(`  ATRASO_CLT: ${dayana6Summary.atrasoCltMinutes}min (esperado: 14min)`);
console.log(`  EXTRA_CLT: ${dayana6Summary.extraCltMinutes}min (esperado: 20min)`);
console.log(`  SALDO_CLT: ${dayana6Summary.saldoCltMinutes}min (esperado: 6min)`);
console.log(`  Excesso de Intervalo: ${dayana6Summary.intervalExcessMinutes}min`);
console.log('\nLogs:');
dayana6Summary.logs.forEach(log => console.log(`  ${log}`));





