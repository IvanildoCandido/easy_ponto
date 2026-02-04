/**
 * Teste com dados reais do banco (MCP): Marizelma 05/01/2026
 * Escala segunda: morning_start 08:00, morning_end 13:00, afternoon null, shift_type FULL_DAY
 * Batidas: 07:57, 13:12, 15:01, 18:18 → trabalhado 512 min, previsto 300 min → extra correto = 212 min
 */
import { computeDaySummaryV2, type PunchTimes, type ScheduledTimes } from '../domain/time-calculation';

// Exatamente como no work_schedules (segunda) e processed_records
const schedule: ScheduledTimes = {
  morningStart: '08:00',
  morningEnd: '13:00',
  afternoonStart: null,
  afternoonEnd: null,
};

const punches: PunchTimes = {
  morningEntry: '2026-01-05 07:57:44',
  lunchExit: '2026-01-05 13:12:43',
  afternoonEntry: '2026-01-05 15:01:37',
  finalExit: '2026-01-05 18:18:57',
};

const summary = computeDaySummaryV2(punches, schedule, '2026-01-05', undefined, 0, 'BANCO_DE_HORAS');

console.log('=== Verificação Marizelma 05/01/2026 (dados do banco) ===');
console.log('worked_minutes:', summary.workedMinutes, '(esperado: 512)');
console.log('expected_minutes:', summary.expectedMinutes, '(esperado: 300)');
console.log('balance_minutes:', summary.balanceMinutes, '(esperado: 212)');
console.log('extra_clt_minutes:', summary.extraCltMinutes, '(esperado: 212, não 313)');
console.log('saldo_clt_minutes:', summary.saldoCltMinutes);
const ok = summary.workedMinutes === 512 && summary.expectedMinutes === 300 && summary.extraCltMinutes === 212;
console.log(ok ? '\n✓ Cálculo correto: extra = 212 min (3h32)' : '\n✗ Cálculo incorreto');
