/**
 * Script para testar por que atraso CLT aparece para alguns e não para outros
 */

import { computeDaySummaryV2 } from '../domain/time-calculation';

// Caso Marizelma - Dia 6/12/2025 (SÁB)
// Batidas: 06:55 / 11:56 / 12:59 / 16:38
// Resultado: ATRASO_CLT: 3min

console.log('=== TESTE MARIZELMA - DIA 6/12/2025 ===\n');

const marizelmaSchedule = {
  morningStart: '07:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
};

const marizelmaPunches = {
  morningEntry: '2025-12-06 06:55:00',
  lunchExit: '2025-12-06 11:56:00',
  afternoonEntry: '2025-12-06 12:59:00',
  finalExit: '2025-12-06 16:38:00',
};

const marizelmaSummary = computeDaySummaryV2(
  marizelmaPunches,
  marizelmaSchedule,
  '2025-12-06'
);

console.log('Marizelma - Dia 6/12/2025:');
console.log(`  ATRASO_CLT: ${marizelmaSummary.atrasoCltMinutes}min`);
console.log(`  EXTRA_CLT: ${marizelmaSummary.extraCltMinutes}min`);
console.log(`  SALDO_CLT: ${marizelmaSummary.saldoCltMinutes}min`);
console.log(`  Excesso de Intervalo: ${marizelmaSummary.intervalExcessMinutes}min`);
console.log(`  Status: ${marizelmaSummary.status}`);
console.log('\nLogs:');
marizelmaSummary.logs.forEach(log => console.log(`  ${log}`));

// Caso Maria Raquel - Dia 12/12/2025 (SEX)
// Batidas: 13:04 / 17:10 / 17:37 / 18:45
// Resultado: H.EXTRA_CLT: 33min (não mostra atraso)

console.log('\n\n=== TESTE MARIA RAQUEL - DIA 12/12/2025 ===\n');

const raquelSchedule = {
  morningStart: null,
  morningEnd: null,
  afternoonStart: '13:00',
  afternoonEnd: '18:00',
};

const raquelPunches = {
  morningEntry: '2025-12-12 13:04:00',
  lunchExit: '2025-12-12 17:10:00',
  afternoonEntry: '2025-12-12 17:37:00',
  finalExit: '2025-12-12 18:45:00',
};

const raquelSummary = computeDaySummaryV2(
  raquelPunches,
  raquelSchedule,
  '2025-12-12'
);

console.log('Maria Raquel - Dia 12/12/2025:');
console.log(`  ATRASO_CLT: ${raquelSummary.atrasoCltMinutes}min`);
console.log(`  EXTRA_CLT: ${raquelSummary.extraCltMinutes}min`);
console.log(`  SALDO_CLT: ${raquelSummary.saldoCltMinutes}min`);
console.log(`  Excesso de Intervalo: ${raquelSummary.intervalExcessMinutes}min`);
console.log(`  Status: ${raquelSummary.status}`);
console.log('\nLogs:');
raquelSummary.logs.forEach(log => console.log(`  ${log}`));

// Verificar se há diferença quando é turno único
console.log('\n\n=== TESTE MARIA RAQUEL COM TURNO ÚNICO ===\n');

const raquelSummarySingleShift = computeDaySummaryV2(
  raquelPunches,
  raquelSchedule,
  '2025-12-12',
  { shiftType: 'AFTERNOON_ONLY', breakMinutes: 20 }
);

console.log('Maria Raquel - Dia 12/12/2025 (Turno Único):');
console.log(`  ATRASO_CLT: ${raquelSummarySingleShift.atrasoCltMinutes}min`);
console.log(`  EXTRA_CLT: ${raquelSummarySingleShift.extraCltMinutes}min`);
console.log(`  SALDO_CLT: ${raquelSummarySingleShift.saldoCltMinutes}min`);
console.log(`  Excesso de Intervalo: ${raquelSummarySingleShift.intervalExcessMinutes}min`);
console.log(`  Status: ${raquelSummarySingleShift.status}`);
console.log('\nLogs:');
raquelSummarySingleShift.logs.forEach(log => console.log(`  ${log}`));










