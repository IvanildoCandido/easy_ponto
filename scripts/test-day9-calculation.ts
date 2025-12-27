/**
 * Script para testar cálculo do dia 9/12/2025
 */

import { parse } from 'date-fns';

// Funções do código
function calculateSecondsDifference(start: Date, end: Date): number {
  const startHours = start.getHours();
  const startMinutes = start.getMinutes();
  const endHours = end.getHours();
  const endMinutes = end.getMinutes();
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  const diffMinutes = endTotalMinutes - startTotalMinutes;
  
  return diffMinutes * 60;
}

function toMinutesFloor(seconds: number): number {
  return Math.floor(seconds / 60);
}

function timeToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60;
}

// Dados do dia 9/12/2025
const workDate = '2025-12-09';
const punches = {
  morningEntry: '2025-12-09 07:58:00',
  lunchExit: '2025-12-09 11:59:00',
  afternoonEntry: '2025-12-09 14:00:00',
  finalExit: '2025-12-09 18:13:00',
};

// Assumindo horário previsto
const schedule = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '14:00',
  afternoonEnd: '18:00',
};

console.log('=== CÁLCULO DIA 9/12/2025 ===\n');

// 1. Calcular Delta Entrada
const realEntry = parse(punches.morningEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
const scheduledEntry = parse(`${workDate} ${schedule.morningStart}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
const deltaEntrySeconds = calculateSecondsDifference(scheduledEntry, realEntry);
const deltaEntryMinutes = toMinutesFloor(deltaEntrySeconds);

console.log('1. DELTA ENTRADA:');
console.log(`   Real: ${punches.morningEntry.split(' ')[1]}`);
console.log(`   Previsto: ${schedule.morningStart}`);
console.log(`   Delta em segundos: ${deltaEntrySeconds}s`);
console.log(`   Delta em minutos (floor): ${deltaEntryMinutes}min`);

// 2. Calcular Delta Saída
const realExit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
const scheduledExit = parse(`${workDate} ${schedule.afternoonEnd}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
const deltaExitSeconds = calculateSecondsDifference(scheduledExit, realExit);
const deltaExitMinutes = toMinutesFloor(deltaExitSeconds);

console.log('\n2. DELTA SAÍDA:');
console.log(`   Real: ${punches.finalExit.split(' ')[1]}`);
console.log(`   Previsto: ${schedule.afternoonEnd}`);
console.log(`   Delta em segundos: ${deltaExitSeconds}s`);
console.log(`   Delta em minutos (floor): ${deltaExitMinutes}min`);

// 3. Aplicar Tolerância CLT (regra dos 5min)
const TOLERANCE_PER_PUNCH_MINUTES = 5;
let atrasoBruto = 0;
let chegadaAntecBruto = 0;
let extraBruto = 0;
let saidaAntecBruto = 0;

console.log('\n3. APLICAR TOLERÂNCIA CLT (5min por batida):');

// Entrada
if (Math.abs(deltaEntryMinutes) <= TOLERANCE_PER_PUNCH_MINUTES) {
  console.log(`   Entrada: |${deltaEntryMinutes}| <= 5 → TOLERADO (zera)`);
} else {
  const excedente = Math.abs(deltaEntryMinutes) - TOLERANCE_PER_PUNCH_MINUTES;
  console.log(`   Entrada: |${deltaEntryMinutes}| > 5 → EXCEDENTE = ${excedente}min`);
  if (deltaEntryMinutes > 0) {
    atrasoBruto = excedente;
  } else {
    chegadaAntecBruto = excedente;
  }
}

// Saída
if (Math.abs(deltaExitMinutes) <= TOLERANCE_PER_PUNCH_MINUTES) {
  console.log(`   Saída: |${deltaExitMinutes}| <= 5 → TOLERADO (zera)`);
} else {
  const excedente = Math.abs(deltaExitMinutes) - TOLERANCE_PER_PUNCH_MINUTES;
  console.log(`   Saída: |${deltaExitMinutes}| > 5 → EXCEDENTE = ${excedente}min`);
  if (deltaExitMinutes > 0) {
    extraBruto = excedente;
  } else {
    saidaAntecBruto = excedente;
  }
}

console.log(`\n   Valores brutos:`);
console.log(`   - Atraso: ${atrasoBruto}min`);
console.log(`   - Chegada Antec: ${chegadaAntecBruto}min`);
console.log(`   - Extra: ${extraBruto}min`);
console.log(`   - Saída Antec: ${saidaAntecBruto}min`);

// 4. Calcular Excesso de Intervalo
const lunchExitDate = parse(punches.lunchExit, 'yyyy-MM-dd HH:mm:ss', new Date());
const afternoonEntryDate = parse(punches.afternoonEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
const intervalRealSeconds = calculateSecondsDifference(lunchExitDate, afternoonEntryDate);
const intervalRealMinutes = toMinutesFloor(intervalRealSeconds);

const intervalExpectedSeconds = timeToSeconds(schedule.afternoonStart) - timeToSeconds(schedule.morningEnd);
const intervalExpectedMinutes = toMinutesFloor(intervalExpectedSeconds);

const excessSeconds = Math.max(0, intervalRealSeconds - intervalExpectedSeconds);
const excessMinutes = toMinutesFloor(excessSeconds);

console.log('\n4. EXCESSO DE INTERVALO:');
console.log(`   Intervalo Real: ${punches.lunchExit.split(' ')[1]} → ${punches.afternoonEntry.split(' ')[1]} = ${intervalRealMinutes}min (${intervalRealSeconds}s)`);
console.log(`   Intervalo Previsto: ${schedule.morningEnd} → ${schedule.afternoonStart} = ${intervalExpectedMinutes}min (${intervalExpectedSeconds}s)`);
console.log(`   Excesso: ${excessMinutes}min (${excessSeconds}s)`);

// 5. Aplicar Desconto de Excesso de Intervalo
if (excessMinutes > 0) {
  console.log('\n5. APLICAR DESCONTO DE EXCESSO DE INTERVALO:');
  const extraOriginal = extraBruto;
  
  if (extraBruto >= excessMinutes) {
    extraBruto = extraBruto - excessMinutes;
    console.log(`   Descontado ${excessMinutes}min do EXTRA (${extraOriginal}min → ${extraBruto}min)`);
  } else if (extraBruto > 0) {
    const restante = excessMinutes - extraBruto;
    chegadaAntecBruto = Math.max(0, chegadaAntecBruto - restante);
    extraBruto = 0;
    console.log(`   Descontado ${extraOriginal}min do EXTRA e ${restante}min da CHEGADA_ANTEC`);
  } else if (chegadaAntecBruto >= excessMinutes) {
    chegadaAntecBruto = chegadaAntecBruto - excessMinutes;
    console.log(`   Descontado ${excessMinutes}min da CHEGADA_ANTEC`);
  } else {
    const restante = excessMinutes - chegadaAntecBruto;
    atrasoBruto = atrasoBruto + restante;
    chegadaAntecBruto = 0;
    console.log(`   Excesso vira atraso: +${restante}min ao ATRASO`);
  }
} else {
  console.log('\n5. APLICAR DESCONTO DE EXCESSO DE INTERVALO:');
  console.log(`   Não há excesso (excesso = ${excessMinutes}min)`);
}

// 6. Resultado Final
const saldoClt = (extraBruto + chegadaAntecBruto) - (atrasoBruto + saidaAntecBruto);

console.log('\n6. RESULTADO FINAL:');
console.log(`   H.EXTRA_CLT: ${extraBruto}min`);
console.log(`   CHEGADA_ANTEC_CLT: ${chegadaAntecBruto}min`);
console.log(`   ATRASO_CLT: ${atrasoBruto}min`);
console.log(`   SAIDA_ANTEC_CLT: ${saidaAntecBruto}min`);
console.log(`   SALDO_CLT: ${saldoClt}min`);
console.log(`\n   Tabela mostra: H.EXTRA_CLT = 7min, SALDO_CLT = 7min+`);
console.log(`   Calculado: H.EXTRA_CLT = ${extraBruto}min, SALDO_CLT = ${saldoClt}min`);






