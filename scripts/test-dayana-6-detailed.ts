/**
 * Teste detalhado do dia 6 da Dayana
 */

import { computeDaySummaryV2 } from '../domain/time-calculation';
import { parse, differenceInMinutes } from 'date-fns';

// Dia 6/12/2025 (SÁB) - Dayana
// Batidas: 08:19 / 11:36 / 12:32 / 15:25
// Tabela mostra: ATRASO_CLT: 14min, H.EXTRA_CLT: 20min, SALDO_CLT: 6min+

console.log('=== ANÁLISE DETALHADA - DAYANA DIA 6/12/2025 ===\n');

// Teste 1: Escala normal de segunda a sexta
console.log('TESTE 1: Escala 08-12 / 13-17\n');
const schedule1 = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '17:00',
};

const punches = {
  morningEntry: '2025-12-06 08:19:00',
  lunchExit: '2025-12-06 11:36:00',
  afternoonEntry: '2025-12-06 12:32:00',
  finalExit: '2025-12-06 15:25:00',
};

const summary1 = computeDaySummaryV2(punches, schedule1, '2025-12-06');
console.log(`  ATRASO_CLT: ${summary1.atrasoCltMinutes}min`);
console.log(`  EXTRA_CLT: ${summary1.extraCltMinutes}min`);
console.log(`  SAIDA_ANTEC_CLT: ${summary1.saidaAntecCltMinutes}min`);
console.log(`  SALDO_CLT: ${summary1.saldoCltMinutes}min`);

// Teste 2: Escala reduzida para sábado (meio dia)
console.log('\nTESTE 2: Escala 08-12 (meio dia no sábado)\n');
const schedule2 = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: null,
  afternoonEnd: null,
};

const summary2 = computeDaySummaryV2(punches, schedule2, '2025-12-06');
console.log(`  ATRASO_CLT: ${summary2.atrasoCltMinutes}min`);
console.log(`  EXTRA_CLT: ${summary2.extraCltMinutes}min`);
console.log(`  SAIDA_ANTEC_CLT: ${summary2.saidaAntecCltMinutes}min`);
console.log(`  SALDO_CLT: ${summary2.saldoCltMinutes}min`);

// Teste 3: Verificar se sábado tem escala diferente
console.log('\nTESTE 3: Escala 08-12 / 12:00-16:00 (sábado reduzido)\n');
const schedule3 = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '12:00',
  afternoonEnd: '16:00',
};

const summary3 = computeDaySummaryV2(punches, schedule3, '2025-12-06');
console.log(`  ATRASO_CLT: ${summary3.atrasoCltMinutes}min`);
console.log(`  EXTRA_CLT: ${summary3.extraCltMinutes}min`);
console.log(`  SAIDA_ANTEC_CLT: ${summary3.saidaAntecCltMinutes}min`);
console.log(`  SALDO_CLT: ${summary3.saldoCltMinutes}min`);

// Análise manual
console.log('\n=== ANÁLISE MANUAL ===\n');
console.log('Batidas:');
console.log('  Entrada: 08:19');
console.log('  Saída almoço: 11:36');
console.log('  Entrada tarde: 12:32');
console.log('  Saída final: 15:25');

console.log('\nSe a escala for 08-12 / 13-17:');
const entrada = parse('2025-12-06 08:19:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const entradaPrevista = parse('2025-12-06 08:00:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const atrasoEntrada = differenceInMinutes(entrada, entradaPrevista);
console.log(`  Atraso entrada: ${atrasoEntrada}min (após tolerância: ${atrasoEntrada - 5}min)`);

const saida = parse('2025-12-06 15:25:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const saidaPrevista = parse('2025-12-06 17:00:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const saidaAntec = differenceInMinutes(saida, saidaPrevista);
console.log(`  Saída antecipada: ${Math.abs(saidaAntec)}min (após tolerância: ${Math.abs(saidaAntec) - 5}min)`);

console.log('\nSe a escala for 08-12 / 13-15 (sábado reduzido):');
const saidaPrevista2 = parse('2025-12-06 15:00:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const saida2 = differenceInMinutes(saida, saidaPrevista2);
console.log(`  Saída: ${saida2}min depois (após tolerância: ${saida2 - 5}min de hora extra)`);


