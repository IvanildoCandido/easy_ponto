/**
 * Funções puras para cálculos de ponto
 * Implementam as regras corretas de tolerância, horas trabalhadas e saldo
 */

import { parse, format } from 'date-fns';

export interface PunchTimes {
  morningEntry: string | null;      // Entrada manhã
  lunchExit: string | null;          // Saída almoço
  afternoonEntry: string | null;     // Entrada tarde
  finalExit: string | null;          // Saída tarde
}

export interface ScheduledTimes {
  morningStart: string | null;       // HH:mm - Entrada manhã prevista
  morningEnd: string | null;          // HH:mm - Saída almoço prevista
  afternoonStart: string | null;     // HH:mm - Entrada tarde prevista
  afternoonEnd: string | null;       // HH:mm - Saída tarde prevista
}

export interface DeltaResult {
  rawDelta: number;                  // Δ bruto em minutos (pode ser negativo)
  adjustedDelta: number;             // Δ ajustado em minutos (após tolerância)
  withinTolerance: boolean;          // Se está dentro da tolerância
}

export interface IntervalResult {
  morningMinutes: number;            // Minutos trabalhados de manhã
  afternoonMinutes: number;           // Minutos trabalhados de tarde
  totalMinutes: number;               // Total em minutos
}

export interface DaySummary {
  status: 'OK' | 'INCONSISTENTE';
  workedMinutes: number;              // Total de minutos trabalhados
  delayMinutes: number;               // Atraso total em minutos
  earlyArrivalMinutes: number;        // Chegada antecipada total em minutos
  overtimeMinutes: number;            // Hora extra total em minutos
  balanceMinutes: number;            // Saldo do dia em minutos
  punchDeltas: {                     // Detalhamento por batida
    morningEntry?: DeltaResult;
    lunchExit?: DeltaResult;
    afternoonEntry?: DeltaResult;
    finalExit?: DeltaResult;
  };
  scheduleApplied: ScheduledTimes;   // Horários previstos aplicados
  logs: string[];                     // Logs de cálculo
}

const TOLERANCE_MINUTES = 5; // 5 minutos

/**
 * Calcula o delta ajustado para uma batida individual
 * Regra: Se |Δ| ≤ 5 min, então Δ_ajustado = 0 (zona neutra)
 *        Se |Δ| > 5 min, então Δ_ajustado = sign(Δ) * (|Δ| - 5)
 * 
 * @param realTime - Horário real da batida (formato: 'yyyy-MM-dd HH:mm:ss')
 * @param scheduledTime - Horário previsto (formato: 'HH:mm')
 * @param workDate - Data de trabalho (formato: 'yyyy-MM-dd')
 * @param toleranceMinutes - Tolerância em minutos (padrão: 5 minutos)
 * @returns DeltaResult com delta bruto, ajustado e flag de tolerância
 */
export function computeDeltaAdjust(
  realTime: string | null,
  scheduledTime: string | null,
  workDate: string,
  toleranceMinutes: number = TOLERANCE_MINUTES
): DeltaResult | null {
  if (!realTime || !scheduledTime) {
    return null;
  }

  try {
    const real = parse(realTime, 'yyyy-MM-dd HH:mm:ss', new Date());
    const scheduled = parse(`${workDate} ${scheduledTime}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
    
    // Calcular diferença usando apenas horas e minutos (ignorar segundos)
    const rawDelta = calculateMinutesDifference(scheduled, real);
    const absDelta = Math.abs(rawDelta);
    
    if (absDelta <= toleranceMinutes) {
      // Dentro da tolerância: zona neutra, não gera crédito nem débito
      return {
        rawDelta,
        adjustedDelta: 0,
        withinTolerance: true,
      };
    } else {
      // Fora da tolerância: aplicar regra do excedente
      const excess = absDelta - toleranceMinutes;
      const adjustedDelta = rawDelta > 0 ? excess : -excess;
      
      return {
        rawDelta,
        adjustedDelta,
        withinTolerance: false,
      };
    }
  } catch (error) {
    return null;
  }
}

/**
 * Calcula diferença em minutos usando apenas horas e minutos (ignora segundos completamente)
 * Exemplo: 08:13:44 até 12:11:06 = 3h 58min (não 3h 57min por truncamento)
 */
function calculateMinutesDifference(start: Date, end: Date): number {
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const endHour = end.getHours();
  const endMinute = end.getMinutes();
  
  // Calcular diferença em minutos usando apenas horas e minutos
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Calcula os intervalos trabalhados (manhã e tarde)
 * Regra: Calcular em minutos usando apenas horas e minutos (ignorar segundos completamente)
 * 
 * @param punches - Horários das batidas
 * @returns IntervalResult com minutos trabalhados por período
 */
export function computeIntervals(punches: PunchTimes): IntervalResult {
  let morningMinutes = 0;
  let afternoonMinutes = 0;

  // Calcular período da manhã
  if (punches.morningEntry && punches.lunchExit) {
    try {
      const entry = parse(punches.morningEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.lunchExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      // Calcular diferença usando apenas horas e minutos (ignorar segundos)
      const diff = calculateMinutesDifference(entry, exit);
      if (diff > 0) {
        morningMinutes = diff;
      }
    } catch (error) {
      // Ignorar erro de parsing
    }
  }

  // Calcular período da tarde
  if (punches.afternoonEntry && punches.finalExit) {
    try {
      const entry = parse(punches.afternoonEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      // Calcular diferença usando apenas horas e minutos (ignorar segundos)
      const diff = calculateMinutesDifference(entry, exit);
      if (diff > 0) {
        afternoonMinutes = diff;
      }
    } catch (error) {
      // Ignorar erro de parsing
    }
  }

  const totalMinutes = morningMinutes + afternoonMinutes;

  return {
    morningMinutes,
    afternoonMinutes,
    totalMinutes,
  };
}

/**
 * Verifica se todas as batidas necessárias estão presentes
 * Para um dia completo, são necessárias 4 batidas
 */
export function hasAllRequiredPunches(punches: PunchTimes, schedule: ScheduledTimes): boolean {
  const needsMorning = schedule.morningStart && schedule.morningEnd;
  const needsAfternoon = schedule.afternoonStart && schedule.afternoonEnd;

  if (needsMorning && needsAfternoon) {
    // Jornada completa: precisa das 4 batidas
    return !!(punches.morningEntry && punches.lunchExit && punches.afternoonEntry && punches.finalExit);
  } else if (needsMorning) {
    // Só manhã: precisa de 2 batidas
    return !!(punches.morningEntry && punches.lunchExit);
  } else if (needsAfternoon) {
    // Só tarde: precisa de 2 batidas
    return !!(punches.afternoonEntry && punches.finalExit);
  }

  // Sem schedule configurado: considerar OK se tiver pelo menos uma batida
  return !!(punches.morningEntry || punches.afternoonEntry);
}

/**
 * Calcula o resumo completo do dia
 * Aplica todas as regras: tolerância, intervalos, saldo, etc.
 * 
 * @param punches - Horários das batidas reais
 * @param schedule - Horários previstos
 * @param workDate - Data de trabalho (formato: 'yyyy-MM-dd')
 * @returns DaySummary com todos os cálculos e status
 */
export function computeDaySummary(
  punches: PunchTimes,
  schedule: ScheduledTimes,
  workDate: string
): DaySummary {
  const logs: string[] = [];
  const punchDeltas: DaySummary['punchDeltas'] = {};

  // Verificar se todas as batidas necessárias estão presentes
  const allPunchesPresent = hasAllRequiredPunches(punches, schedule);
  const status: 'OK' | 'INCONSISTENTE' = allPunchesPresent ? 'OK' : 'INCONSISTENTE';

  if (!allPunchesPresent) {
    logs.push(`⚠️ INCONSISTENTE: Faltam batidas necessárias`);
  }

  // Calcular intervalos trabalhados
  const intervals = computeIntervals(punches);
  logs.push(`Intervalos: Manhã=${intervals.morningMinutes}min, Tarde=${intervals.afternoonMinutes}min, Total=${intervals.totalMinutes}min`);

  // Calcular deltas por batida (só se tiver schedule e batida)
  let delayMinutes = 0;
  let earlyArrivalMinutes = 0;
  let overtimeMinutes = 0;
  let balanceMinutes = 0;

  // Entrada manhã
  if (punches.morningEntry && schedule.morningStart) {
    const delta = computeDeltaAdjust(punches.morningEntry, schedule.morningStart, workDate);
    if (delta) {
      punchDeltas.morningEntry = delta;
      if (delta.adjustedDelta > 0) {
        delayMinutes += delta.adjustedDelta;
        logs.push(`Entrada manhã: atraso ${delta.adjustedDelta}min (bruto: ${delta.rawDelta}min)`);
      } else if (delta.adjustedDelta < 0) {
        earlyArrivalMinutes += Math.abs(delta.adjustedDelta);
        logs.push(`Entrada manhã: chegada antecipada ${Math.abs(delta.adjustedDelta)}min (bruto: ${delta.rawDelta}min)`);
      } else {
        logs.push(`Entrada manhã: dentro da tolerância (bruto: ${delta.rawDelta}min)`);
      }
    }
  }

  // Saída almoço (não gera atraso/extra normalmente, mas pode ser usado para validação)
  if (punches.lunchExit && schedule.morningEnd) {
    const delta = computeDeltaAdjust(punches.lunchExit, schedule.morningEnd, workDate);
    if (delta) {
      punchDeltas.lunchExit = delta;
      // Saída almoço não gera atraso/extra normalmente, mas pode ser registrado
      logs.push(`Saída almoço: delta ${delta.adjustedDelta}min (bruto: ${delta.rawDelta}min)`);
    }
  }

  // Entrada tarde
  if (punches.afternoonEntry && schedule.afternoonStart) {
    const delta = computeDeltaAdjust(punches.afternoonEntry, schedule.afternoonStart, workDate);
    if (delta) {
      punchDeltas.afternoonEntry = delta;
      if (delta.adjustedDelta > 0) {
        delayMinutes += delta.adjustedDelta;
        logs.push(`Entrada tarde: atraso ${delta.adjustedDelta}min (bruto: ${delta.rawDelta}min)`);
      } else if (delta.adjustedDelta < 0) {
        earlyArrivalMinutes += Math.abs(delta.adjustedDelta);
        logs.push(`Entrada tarde: chegada antecipada ${Math.abs(delta.adjustedDelta)}min (bruto: ${delta.rawDelta}min)`);
      } else {
        logs.push(`Entrada tarde: dentro da tolerância (bruto: ${delta.rawDelta}min)`);
      }
    }
  }

  // Saída tarde (gera hora extra se positivo)
  if (punches.finalExit && schedule.afternoonEnd) {
    const delta = computeDeltaAdjust(punches.finalExit, schedule.afternoonEnd, workDate);
    if (delta) {
      punchDeltas.finalExit = delta;
      if (delta.adjustedDelta > 0) {
        overtimeMinutes += delta.adjustedDelta;
        logs.push(`Saída tarde: hora extra ${delta.adjustedDelta}min (bruto: ${delta.rawDelta}min)`);
      } else if (delta.adjustedDelta < 0) {
        // Saída antecipada (pode ser tratada como débito, mas por enquanto não contabilizamos)
        logs.push(`Saída tarde: saída antecipada ${Math.abs(delta.adjustedDelta)}min (bruto: ${delta.rawDelta}min)`);
      } else {
        logs.push(`Saída tarde: dentro da tolerância (bruto: ${delta.rawDelta}min)`);
      }
    }
  }

  // Calcular saldo do dia
  // Saldo = (chegada antecipada + hora extra) - atraso
  balanceMinutes = (earlyArrivalMinutes + overtimeMinutes) - delayMinutes;
  logs.push(`Saldo: ${balanceMinutes}min (Antec: ${earlyArrivalMinutes}min + Extra: ${overtimeMinutes}min - Atraso: ${delayMinutes}min)`);

  // Se status é INCONSISTENTE, não permitir cálculos de atraso/extra/saldo baseados em suposições
  if (status === 'INCONSISTENTE') {
    logs.push(`⚠️ Status INCONSISTENTE: Cálculos de atraso/extra/saldo podem estar incompletos`);
    // Manter os cálculos parciais, mas marcar como inconsistentes
  }

  return {
    status,
    workedMinutes: intervals.totalMinutes,
    delayMinutes,
    earlyArrivalMinutes,
    overtimeMinutes,
    balanceMinutes,
    punchDeltas,
    scheduleApplied: schedule,
    logs,
  };
}

