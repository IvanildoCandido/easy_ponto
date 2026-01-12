/**
 * Script para explicar os cálculos de cada batida
 * Analisa os dados da tabela e explica passo a passo como cada valor é calculado
 */

import { computeDaySummaryV2 } from '../domain/time-calculation';
import { applyCltTolerance, computeStartEndDeltas } from '../domain/clt-tolerance';

// Dados da tabela da imagem
const testCases = [
  {
    date: '2025-12-12',
    dayOfWeek: 'SEX',
    punches: {
      morningEntry: '2025-12-12 13:04:00',
      lunchExit: '2025-12-12 17:10:00',
      afternoonEntry: '2025-12-12 17:37:00',
      finalExit: '2025-12-12 18:45:00',
    },
    expected: {
      extraClt: 40,
      saldoClt: 40,
    },
  },
  {
    date: '2025-12-11',
    dayOfWeek: 'QUI',
    punches: {
      morningEntry: '2025-12-11 13:02:00',
      lunchExit: '2025-12-11 17:14:00',
      afternoonEntry: '2025-12-11 17:33:00',
      finalExit: '2025-12-11 19:04:00',
    },
    expected: {
      extraClt: 59,
      saldoClt: 59,
    },
  },
  {
    date: '2025-12-10',
    dayOfWeek: 'QUA',
    punches: {
      morningEntry: '2025-12-10 13:04:00',
      lunchExit: '2025-12-10 17:00:00',
      afternoonEntry: '2025-12-10 17:20:00',
      finalExit: '2025-12-10 18:34:00',
    },
    expected: {
      extraClt: 29,
      saldoClt: 29,
    },
  },
  {
    date: '2025-12-09',
    dayOfWeek: 'TER',
    punches: {
      morningEntry: '2025-12-09 12:59:00',
      lunchExit: '2025-12-09 17:09:00',
      afternoonEntry: '2025-12-09 17:24:00',
      finalExit: '2025-12-09 18:15:00',
    },
    expected: {
      extraClt: 10,
      saldoClt: 10,
    },
  },
];

// Assumindo horário padrão: 13:00 às 18:00 (5 horas)
// Manhã: 13:00 - 17:00 (4 horas)
// Tarde: 17:00 - 18:00 (1 hora)
// Intervalo: 17:00 - 17:00 (0 minutos, mas pode ter intervalo de 20min para horistas)

function explainCalculation(
  date: string,
  dayOfWeek: string,
  punches: {
    morningEntry: string;
    lunchExit: string;
    afternoonEntry: string;
    finalExit: string;
  },
  schedule: {
    morningStart: string;
    morningEnd: string;
    afternoonStart: string;
    afternoonEnd: string;
  },
  expected: { extraClt: number; saldoClt: number }
) {
  console.log('\n' + '='.repeat(80));
  console.log(`📅 ${date} (${dayOfWeek})`);
  console.log('='.repeat(80));

  console.log('\n📋 BATIDAS REAIS:');
  console.log(`  Entrada:     ${punches.morningEntry.split(' ')[1]}`);
  console.log(`  Saída Int.:  ${punches.lunchExit.split(' ')[1]}`);
  console.log(`  Entrada Pós: ${punches.afternoonEntry.split(' ')[1]}`);
  console.log(`  Saída Final: ${punches.finalExit.split(' ')[1]}`);

  console.log('\n📋 HORÁRIOS PREVISTOS:');
  console.log(`  Entrada:     ${schedule.morningStart}`);
  console.log(`  Saída Int.:  ${schedule.morningEnd}`);
  console.log(`  Entrada Pós: ${schedule.afternoonStart}`);
  console.log(`  Saída Final: ${schedule.afternoonEnd}`);

  // Calcular horas trabalhadas
  const entry1 = new Date(punches.morningEntry);
  const exit1 = new Date(punches.lunchExit);
  const entry2 = new Date(punches.afternoonEntry);
  const exit2 = new Date(punches.finalExit);

  const period1Minutes = Math.floor((exit1.getTime() - entry1.getTime()) / 60000);
  const period2Minutes = Math.floor((exit2.getTime() - entry2.getTime()) / 60000);
  const totalWorkedMinutes = period1Minutes + period2Minutes;

  console.log('\n⏱️  HORAS TRABALHADAS:');
  console.log(`  Período 1 (entrada → saída intervalo): ${period1Minutes}min`);
  console.log(`  Período 2 (entrada pós → saída final): ${period2Minutes}min`);
  console.log(`  TOTAL TRABALHADO: ${totalWorkedMinutes}min (${Math.floor(totalWorkedMinutes / 60)}h ${totalWorkedMinutes % 60}min)`);

  // Calcular horas previstas
  const scheduleStart = schedule.morningStart.split(':').map(Number);
  const scheduleEnd = schedule.afternoonEnd.split(':').map(Number);
  const scheduleBreakStart = schedule.morningEnd.split(':').map(Number);
  const scheduleBreakEnd = schedule.afternoonStart.split(':').map(Number);

  const expectedStartMinutes = scheduleStart[0] * 60 + scheduleStart[1];
  const expectedEndMinutes = scheduleEnd[0] * 60 + scheduleEnd[1];
  const expectedBreakStartMinutes = scheduleBreakStart[0] * 60 + scheduleBreakStart[1];
  const expectedBreakEndMinutes = scheduleBreakEnd[0] * 60 + scheduleBreakEnd[1];

  const expectedPeriod1Minutes = expectedBreakStartMinutes - expectedStartMinutes;
  const expectedPeriod2Minutes = expectedEndMinutes - expectedBreakEndMinutes;
  const totalExpectedMinutes = expectedPeriod1Minutes + expectedPeriod2Minutes;

  console.log('\n⏱️  HORAS PREVISTAS:');
  console.log(`  Período 1 previsto: ${expectedPeriod1Minutes}min`);
  console.log(`  Período 2 previsto: ${expectedPeriod2Minutes}min`);
  console.log(`  TOTAL PREVISTO: ${totalExpectedMinutes}min (${Math.floor(totalExpectedMinutes / 60)}h ${totalExpectedMinutes % 60}min)`);

  // Saldo bruto (gerencial)
  const balanceMinutes = totalWorkedMinutes - totalExpectedMinutes;
  console.log('\n💰 SALDO GERENCIAL:');
  console.log(`  ${totalWorkedMinutes}min trabalhadas - ${totalExpectedMinutes}min previstas = ${balanceMinutes}min`);

  // Calcular deltas CLT (entrada e saída)
  const realEntryMinutes = entry1.getHours() * 60 + entry1.getMinutes();
  const realExitMinutes = exit2.getHours() * 60 + exit2.getMinutes();

  const deltaStart = realEntryMinutes - expectedStartMinutes;
  const deltaEnd = realExitMinutes - expectedEndMinutes;

  console.log('\n📊 DELTAS CLT (Art. 58 §1º):');
  console.log(`  Delta Entrada: ${deltaStart}min (${deltaStart > 0 ? 'ATRASO' : deltaStart < 0 ? 'ANTECIPADO' : 'NO HORÁRIO'})`);
  console.log(`  Delta Saída:   ${deltaEnd}min (${deltaEnd > 0 ? 'HORA EXTRA' : deltaEnd < 0 ? 'SAÍDA ANTECIPADA' : 'NO HORÁRIO'})`);

  // Aplicar tolerância CLT
  console.log('\n🔍 APLICAÇÃO DA TOLERÂNCIA CLT:');
  
  // Regra dos 5 minutos por batida
  const absStart = Math.abs(deltaStart);
  const absEnd = Math.abs(deltaEnd);

  let atrasoBruto = 0;
  let chegadaAntecBruto = 0;
  let extraBruto = 0;
  let saidaAntecBruto = 0;

  if (absStart <= 5) {
    console.log(`  ✅ Entrada: diferença ${deltaStart}min (abs=${absStart}min) <= 5min → TOLERADO (zera)`);
  } else {
    const excedente = absStart - 5;
    console.log(`  ❌ Entrada: diferença ${deltaStart}min (abs=${absStart}min) > 5min → considera EXCEDENTE (${excedente}min)`);
    if (deltaStart > 0) {
      atrasoBruto = excedente;
    } else {
      chegadaAntecBruto = excedente;
    }
  }

  if (absEnd <= 5) {
    console.log(`  ✅ Saída: diferença ${deltaEnd}min (abs=${absEnd}min) <= 5min → TOLERADO (zera)`);
  } else {
    const excedente = absEnd - 5;
    console.log(`  ❌ Saída: diferença ${deltaEnd}min (abs=${absEnd}min) > 5min → considera EXCEDENTE (${excedente}min)`);
    if (deltaEnd > 0) {
      extraBruto = excedente;
    } else {
      saidaAntecBruto = excedente;
    }
  }

  const saldoBrutoDia = (extraBruto + chegadaAntecBruto) - (atrasoBruto + saidaAntecBruto);
  console.log(`\n  Saldo bruto do dia: ${saldoBrutoDia}min = (${extraBruto}min extra + ${chegadaAntecBruto}min cheg.antec) - (${atrasoBruto}min atraso + ${saidaAntecBruto}min saida.antec)`);

  // Valores finais CLT (teto de 10min não zera valores individuais)
  const atrasoClt = atrasoBruto;
  const chegadaAntecClt = chegadaAntecBruto;
  const extraClt = extraBruto;
  const saidaAntecClt = saidaAntecBruto;
  const saldoClt = (extraClt + chegadaAntecClt) - (atrasoClt + saidaAntecClt);

  console.log('\n📈 VALORES CLT FINAIS:');
  console.log(`  ATRASO_CLT:        ${atrasoClt}min`);
  console.log(`  CHEGADA_ANTEC_CLT: ${chegadaAntecClt}min`);
  console.log(`  EXTRA_CLT:         ${extraClt}min`);
  console.log(`  SAIDA_ANTEC_CLT:   ${saidaAntecClt}min`);
  console.log(`  SALDO_CLT:         ${saldoClt}min`);

  console.log('\n🎯 RESULTADO ESPERADO vs CALCULADO:');
  console.log(`  H.EXTRA_CLT esperado: ${expected.extraClt}min`);
  console.log(`  H.EXTRA_CLT calculado: ${extraClt}min ${extraClt === expected.extraClt ? '✅' : '❌'}`);
  console.log(`  SALDO_CLT esperado: ${expected.saldoClt}min`);
  console.log(`  SALDO_CLT calculado: ${saldoClt}min ${saldoClt === expected.saldoClt ? '✅' : '❌'}`);

  if (extraClt !== expected.extraClt || saldoClt !== expected.saldoClt) {
    console.log('\n⚠️  DISCREPÂNCIA DETECTADA!');
    console.log('  Verifique se o horário previsto está correto.');
  }

  // Executar cálculo real usando a função do sistema
  const result = computeDaySummaryV2(
    {
      morningEntry: punches.morningEntry,
      lunchExit: punches.lunchExit,
      afternoonEntry: punches.afternoonEntry,
      finalExit: punches.finalExit,
    },
    {
      morningStart: schedule.morningStart,
      morningEnd: schedule.morningEnd,
      afternoonStart: schedule.afternoonStart,
      afternoonEnd: schedule.afternoonEnd,
    },
    date,
    undefined, // singleShiftInfo
    0, // intervalToleranceMinutes
    'BANCO_DE_HORAS' // compensationType
  );

  console.log('\n🔧 RESULTADO DO SISTEMA:');
  console.log(`  H.EXTRA_CLT: ${result.extraCltMinutes}min`);
  console.log(`  SALDO_CLT: ${result.saldoCltMinutes}min`);
  console.log(`  Status: ${result.status}`);

  if (result.logs && result.logs.length > 0) {
    console.log('\n📝 LOGS DO SISTEMA:');
    result.logs.forEach(log => console.log(`  ${log}`));
  }
}

// Executar para cada caso de teste
// Assumindo horário padrão: 13:00 - 17:00 (manhã), 17:00 - 18:00 (tarde)
// Mas pode ser diferente! Precisamos verificar qual é o horário real configurado
const defaultSchedule = {
  morningStart: '13:00',
  morningEnd: '17:00',
  afternoonStart: '17:00',
  afternoonEnd: '18:00',
};

console.log('🔍 ANÁLISE DOS CÁLCULOS DE CADA BATIDA');
console.log('='.repeat(80));
console.log('\n⚠️  ATENÇÃO: Este script assume um horário padrão.');
console.log('   Para análise precisa, é necessário verificar o horário configurado no banco de dados.');
console.log('   Horário assumido:', defaultSchedule);

testCases.forEach(testCase => {
  explainCalculation(
    testCase.date,
    testCase.dayOfWeek,
    testCase.punches,
    defaultSchedule,
    testCase.expected
  );
});

console.log('\n' + '='.repeat(80));
console.log('✅ Análise concluída!');
console.log('='.repeat(80));










