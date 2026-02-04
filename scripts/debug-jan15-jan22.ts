/**
 * Debug: reproduzir cálculo dos dias 15/01 e 22/01 (Quintas) para comparar critérios
 */
import { computeDaySummaryV2 } from '../domain/time-calculation';

const scheduleQuinta = {
  morningStart: '08:00',
  morningEnd: '12:00',
  afternoonStart: '13:00',
  afternoonEnd: '18:00',
};

// 15/01: 07:56, 12:58, 15:00, 17:55 - intervalo 12:58-15:00 = 2h02min, previsto 1h → excesso 62min
const punches15 = {
  morningEntry: '2026-01-15 07:56:06',
  lunchExit: '2026-01-15 12:58:56',
  afternoonEntry: '2026-01-15 15:00:25',
  finalExit: '2026-01-15 17:55:43',
};

// 22/01: 07:55, 11:59, 14:00, 18:14 - intervalo 11:59-14:00 = 2h01min, previsto 1h → excesso 61min
const punches22 = {
  morningEntry: '2026-01-22 07:55:04',
  lunchExit: '2026-01-22 11:59:51',
  afternoonEntry: '2026-01-22 14:00:31',
  finalExit: '2026-01-22 18:14:01',
};

console.log('=== 15/01/2026 (QUI) ===');
const summary15 = computeDaySummaryV2(punches15, scheduleQuinta, '2026-01-15', undefined, 0, 'BANCO_DE_HORAS');
console.log('worked_minutes:', summary15.workedMinutes);
console.log('expected_minutes:', summary15.expectedMinutes);
console.log('intervalExcessMinutes:', summary15.intervalExcessMinutes);
console.log('atraso_clt:', summary15.atrasoCltMinutes);
console.log('extra_clt:', summary15.extraCltMinutes);
console.log('saldo_clt:', summary15.saldoCltMinutes);
console.log('');

console.log('=== 22/01/2026 (QUI) ===');
const summary22 = computeDaySummaryV2(punches22, scheduleQuinta, '2026-01-22', undefined, 0, 'BANCO_DE_HORAS');
console.log('worked_minutes:', summary22.workedMinutes);
console.log('expected_minutes:', summary22.expectedMinutes);
console.log('intervalExcessMinutes:', summary22.intervalExcessMinutes);
console.log('atraso_clt:', summary22.atrasoCltMinutes);
console.log('extra_clt:', summary22.extraCltMinutes);
console.log('saldo_clt:', summary22.saldoCltMinutes);
console.log('');

console.log('=== Esperado (critério único) ===');
console.log('15/01: excesso 62min, sem extra → atraso 62, saldo -62');
console.log('22/01: excesso 61min, extra 9min → desconta 9 do extra (0), restante 52 → atraso 52, saldo -52');
