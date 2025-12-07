/**
 * Testes unitários para as funções de cálculo de ponto
 * Cobre todas as regras: tolerância, intervalos, batidas ausentes, etc.
 */

import {
  computeDeltaAdjust,
  computeIntervals,
  computeDaySummary,
  hasAllRequiredPunches,
  PunchTimes,
  ScheduledTimes,
} from '../calculation-core';

describe('computeDeltaAdjust - Tolerância por batida', () => {
  const workDate = '2025-06-12';
  const toleranceMinutes = 5; // 5 minutos

  test('Dentro da tolerância (atraso de 4 min) → ajustado = 0', () => {
    const result = computeDeltaAdjust(
      '2025-06-12 08:04:00',
      '08:00',
      workDate,
      toleranceMinutes
    );
    
    expect(result).not.toBeNull();
    expect(result!.rawDelta).toBe(4); // 4 minutos
    expect(result!.adjustedDelta).toBe(0); // Dentro da tolerância, zera
    expect(result!.withinTolerance).toBe(true);
  });

  test('Dentro da tolerância (adiantamento de 4 min) → ajustado = 0', () => {
    const result = computeDeltaAdjust(
      '2025-06-12 07:56:00',
      '08:00',
      workDate,
      toleranceMinutes
    );
    
    expect(result).not.toBeNull();
    expect(result!.rawDelta).toBe(-4); // -4 minutos
    expect(result!.adjustedDelta).toBe(0); // Dentro da tolerância, zera
    expect(result!.withinTolerance).toBe(true);
  });

  test('Exatamente na tolerância (atraso de 5 min) → ajustado = 0', () => {
    const result = computeDeltaAdjust(
      '2025-06-12 08:05:00',
      '08:00',
      workDate,
      toleranceMinutes
    );
    
    expect(result).not.toBeNull();
    expect(result!.rawDelta).toBe(5);
    expect(result!.adjustedDelta).toBe(0); // Exatamente na tolerância, zera
    expect(result!.withinTolerance).toBe(true);
  });

  test('Fora da tolerância (atraso de 6 min) → ajustado = 1 min', () => {
    const result = computeDeltaAdjust(
      '2025-06-12 08:06:00',
      '08:00',
      workDate,
      toleranceMinutes
    );
    
    expect(result).not.toBeNull();
    expect(result!.rawDelta).toBe(6);
    expect(result!.adjustedDelta).toBe(1); // Excedente: 6 - 5 = 1 min
    expect(result!.withinTolerance).toBe(false);
  });

  test('Fora da tolerância (atraso de 8 min) → ajustado = 3 min', () => {
    const result = computeDeltaAdjust(
      '2025-06-12 08:08:00',
      '08:00',
      workDate,
      toleranceMinutes
    );
    
    expect(result).not.toBeNull();
    expect(result!.rawDelta).toBe(8);
    expect(result!.adjustedDelta).toBe(3); // Excedente: 8 - 5 = 3 min
    expect(result!.withinTolerance).toBe(false);
  });

  test('Fora da tolerância (adiantamento de 6 min) → ajustado = -1 min', () => {
    const result = computeDeltaAdjust(
      '2025-06-12 07:54:00',
      '08:00',
      workDate,
      toleranceMinutes
    );
    
    expect(result).not.toBeNull();
    expect(result!.rawDelta).toBe(-6);
    expect(result!.adjustedDelta).toBe(-1); // Excedente: -6 + 5 = -1 min
    expect(result!.withinTolerance).toBe(false);
  });

  test('Fora da tolerância (adiantamento de 9 min) → ajustado = -4 min', () => {
    const result = computeDeltaAdjust(
      '2025-06-12 07:51:00',
      '08:00',
      workDate,
      toleranceMinutes
    );
    
    expect(result).not.toBeNull();
    expect(result!.rawDelta).toBe(-9);
    expect(result!.adjustedDelta).toBe(-4); // Excedente: -9 + 5 = -4 min
    expect(result!.withinTolerance).toBe(false);
  });

  test('Retorna null se horário real for null', () => {
    const result = computeDeltaAdjust(null, '08:00', workDate, toleranceMinutes);
    expect(result).toBeNull();
  });

  test('Retorna null se horário previsto for null', () => {
    const result = computeDeltaAdjust('2025-06-12 08:00:00', null, workDate, toleranceMinutes);
    expect(result).toBeNull();
  });
});

describe('computeIntervals - Cálculo de intervalos trabalhados', () => {
  test('Calcula corretamente manhã + tarde = total', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const result = computeIntervals(punches);

    expect(result.morningMinutes).toBe(4 * 60); // 4 horas = 240 minutos
    expect(result.afternoonMinutes).toBe(4 * 60); // 4 horas = 240 minutos
    expect(result.totalMinutes).toBe(8 * 60); // 480 minutos
  });

  test('Ignora segundos (calcula apenas minutos)', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:30', // 30 segundos a mais (ignorado)
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const result = computeIntervals(punches);

    expect(result.morningMinutes).toBe(4 * 60); // 4h (segundos ignorados)
    expect(result.afternoonMinutes).toBe(4 * 60); // 4h
    expect(result.totalMinutes).toBe(8 * 60); // 8h
  });

  test('Calcula apenas manhã se não houver tarde', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: null,
      finalExit: null,
    };

    const result = computeIntervals(punches);

    expect(result.morningMinutes).toBe(4 * 60);
    expect(result.afternoonMinutes).toBe(0);
    expect(result.totalMinutes).toBe(4 * 60);
  });

  test('Calcula apenas tarde se não houver manhã', () => {
    const punches: PunchTimes = {
      morningEntry: null,
      lunchExit: null,
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const result = computeIntervals(punches);

    expect(result.morningMinutes).toBe(0);
    expect(result.afternoonMinutes).toBe(4 * 60);
    expect(result.totalMinutes).toBe(4 * 60);
  });

  test('Retorna 0 se não houver batidas', () => {
    const punches: PunchTimes = {
      morningEntry: null,
      lunchExit: null,
      afternoonEntry: null,
      finalExit: null,
    };

    const result = computeIntervals(punches);

    expect(result.morningMinutes).toBe(0);
    expect(result.afternoonMinutes).toBe(0);
    expect(result.totalMinutes).toBe(0);
  });

  test('Calcula corretamente (caso real: 07:43)', () => {
    // Caso real: entrada 08:13, saída 12:11, entrada 14:11, saída 17:56
    // Manhã: 12:11 - 08:13 = 3h 58min = 238min
    // Tarde: 17:56 - 14:11 = 3h 45min = 225min
    // Total: 463min = 7h 43min
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:13:00',
      lunchExit: '2025-06-12 12:11:00',
      afternoonEntry: '2025-06-12 14:11:00',
      finalExit: '2025-06-12 17:56:00',
    };

    const result = computeIntervals(punches);

    expect(result.morningMinutes).toBe(238); // 3h 58min
    expect(result.afternoonMinutes).toBe(225); // 3h 45min
    expect(result.totalMinutes).toBe(463); // 7h 43min
  });
});

describe('hasAllRequiredPunches - Validação de batidas necessárias', () => {
  test('Jornada completa: precisa de 4 batidas', () => {
    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const punchesComplete: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const punchesIncomplete: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: null, // Falta esta
    };

    expect(hasAllRequiredPunches(punchesComplete, schedule)).toBe(true);
    expect(hasAllRequiredPunches(punchesIncomplete, schedule)).toBe(false);
  });

  test('Só manhã: precisa de 2 batidas', () => {
    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: null,
      afternoonEnd: null,
    };

    const punchesComplete: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: null,
      finalExit: null,
    };

    const punchesIncomplete: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: null, // Falta esta
      afternoonEntry: null,
      finalExit: null,
    };

    expect(hasAllRequiredPunches(punchesComplete, schedule)).toBe(true);
    expect(hasAllRequiredPunches(punchesIncomplete, schedule)).toBe(false);
  });

  test('Só tarde: precisa de 2 batidas', () => {
    const schedule: ScheduledTimes = {
      morningStart: null,
      morningEnd: null,
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const punchesComplete: PunchTimes = {
      morningEntry: null,
      lunchExit: null,
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const punchesIncomplete: PunchTimes = {
      morningEntry: null,
      lunchExit: null,
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: null, // Falta esta
    };

    expect(hasAllRequiredPunches(punchesComplete, schedule)).toBe(true);
    expect(hasAllRequiredPunches(punchesIncomplete, schedule)).toBe(false);
  });
});

describe('computeDaySummary - Cálculo completo do dia', () => {
  const workDate = '2025-06-12';

  test('Dia completo com todas as batidas → status OK', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.status).toBe('OK');
    expect(result.workedMinutes).toBe(8 * 60); // 8 horas
    expect(result.delayMinutes).toBe(0);
    expect(result.earlyArrivalMinutes).toBe(0);
    expect(result.overtimeMinutes).toBe(0);
    expect(result.balanceMinutes).toBe(0);
  });

  test('Atraso na entrada manhã (8 min) → conta 3 min de atraso', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:08:00', // 8 min atrasado
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.status).toBe('OK');
    expect(result.delayMinutes).toBe(3); // Excedente: 8 - 5 = 3 min
    expect(result.balanceMinutes).toBe(-3); // Saldo negativo
  });

  test('Chegada antecipada na entrada manhã (9 min) → conta 4 min de antecipação', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 07:51:00', // 9 min adiantado
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.status).toBe('OK');
    expect(result.earlyArrivalMinutes).toBe(4); // Excedente: 9 - 5 = 4 min
    expect(result.balanceMinutes).toBe(4); // Saldo positivo
  });

  test('Hora extra na saída (8 min) → conta 3 min de extra', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:08:00', // 8 min extra
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.status).toBe('OK');
    expect(result.overtimeMinutes).toBe(3); // Excedente: 8 - 5 = 3 min
    expect(result.balanceMinutes).toBe(3); // Saldo positivo
  });

  test('Falta batida → status INCONSISTENTE', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:00:00',
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: null, // Falta esta
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.status).toBe('INCONSISTENTE');
    // Ainda calcula o que pode, mas marca como inconsistente
    expect(result.workedMinutes).toBeGreaterThan(0);
  });

  test('Tolerância não gera crédito (chegada 4 min cedo)', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 07:56:00', // 4 min cedo (dentro da tolerância)
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:00:00',
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.status).toBe('OK');
    expect(result.earlyArrivalMinutes).toBe(0); // Dentro da tolerância, não gera crédito
    expect(result.balanceMinutes).toBe(0);
  });

  test('Caso real: entrada 08:13 com previsto 08:00 → atraso 8 min', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:13:00',
      lunchExit: '2025-06-12 12:11:00',
      afternoonEntry: '2025-06-12 14:11:00',
      finalExit: '2025-06-12 17:56:00',
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '14:00',
      afternoonEnd: '18:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.status).toBe('OK');
    // Atraso: 13 min - 5 min (tolerância) = 8 min
    expect(result.delayMinutes).toBeGreaterThanOrEqual(8);
    // Entrada tarde: 11 min - 5 min (tolerância) = 6 min de atraso
    // Total atraso: 8 + 6 = 14 min
    expect(result.punchDeltas.morningEntry?.adjustedDelta).toBe(8);
  });

  test('Saldo calculado corretamente: (antec + extra) - atraso', () => {
    const punches: PunchTimes = {
      morningEntry: '2025-06-12 08:08:00', // 3 min atraso (8-5)
      lunchExit: '2025-06-12 12:00:00',
      afternoonEntry: '2025-06-12 13:00:00',
      finalExit: '2025-06-12 17:10:00', // 10 min extra (10-5 = 5 min)
    };

    const schedule: ScheduledTimes = {
      morningStart: '08:00',
      morningEnd: '12:00',
      afternoonStart: '13:00',
      afternoonEnd: '17:00',
    };

    const result = computeDaySummary(punches, schedule, workDate);

    expect(result.delayMinutes).toBe(3);
    expect(result.overtimeMinutes).toBe(5);
    expect(result.balanceMinutes).toBe((0 + 5) - 3); // 2 min positivo
  });
});

