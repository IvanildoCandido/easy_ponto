/**
 * Funções puras para cálculos de ponto - Modelo baseado em Horas Trabalhadas vs Horas Previstas
 * 
 * REGRA DE OURO:
 * SALDO = HORAS_TRABALHADAS - HORAS_PREVISTAS
 * 
 * Onde:
 * - HORAS_TRABALHADAS = soma dos períodos realmente trabalhados (diferença entre batidas)
 * - HORAS_PREVISTAS = carga horária prevista pela escala do dia
 * 
 * IMPORTANTE:
 * - Calcular TUDO em segundos e converter para minutos APENAS no final
 * - Não truncar por turno nem por batida
 * - Excesso de intervalo NÃO é atraso, é um indicador separado
 */

import { parse } from 'date-fns';

export interface PunchTimes {
  morningEntry: string | null;      // Entrada manhã
  lunchExit: string | null;          // Saída almoço
  afternoonEntry: string | null;     // Entrada tarde
  finalExit: string | null;          // Saída tarde
}

export interface ScheduledTimes {
  morningStart: string | null;       // HH:mm - Entrada manhã prevista
  morningEnd: string | null;         // HH:mm - Saída almoço prevista
  afternoonStart: string | null;     // HH:mm - Entrada tarde prevista
  afternoonEnd: string | null;       // HH:mm - Saída tarde prevista
}

export interface DaySummary {
  status: 'OK' | 'INCONSISTENTE';
  workedSeconds: number;              // Total de segundos trabalhados
  workedMinutes: number;              // Total de minutos trabalhados (floor(seconds/60))
  expectedSeconds: number;            // Total de segundos previstos
  expectedMinutes: number;            // Total de minutos previstos
  balanceSeconds: number;              // Saldo em segundos (worked - expected)
  balanceMinutes: number;              // Saldo GERENCIAL em minutos (worked - expected)
  
  // Indicadores informativos (apenas início/fim da jornada, NÃO determinam o saldo)
  delayMinutes: number;               // Atraso na primeira entrada (indicador)
  earlyArrivalMinutes: number;        // Chegada antecipada (indicador)
  overtimeMinutes: number;            // Hora extra na última saída (indicador)
  earlyExitMinutes: number;           // Saída antecipada (indicador)
  
  // Excesso de intervalo (indicador separado, NÃO é atraso)
  intervalExcessSeconds: number;      // Excesso de intervalo do almoço (em segundos)
  intervalExcessMinutes: number;      // Excesso de intervalo do almoço (em minutos)
  
  // Cálculo CLT (art. 58 §1º + Súmula 366 TST)
  // Tolerância: 5 min por marcação, máximo 10 min no dia (apenas início/fim da jornada)
  atrasoCltMinutes: number;          // Atraso CLT (após tolerância)
  chegadaAntecCltMinutes: number;    // Chegada antecipada CLT (após tolerância)
  extraCltMinutes: number;            // Hora extra CLT (após tolerância)
  saidaAntecCltMinutes: number;      // Saída antecipada CLT (após tolerância)
  saldoCltMinutes: number;            // SALDO_CLT = (extra + chegada_antec) - (atraso + saida_antec)
  
  // Detalhamento por período
  morningWorkedSeconds: number;      // Segundos trabalhados de manhã
  afternoonWorkedSeconds: number;     // Segundos trabalhados de tarde
  morningExpectedSeconds: number;    // Segundos previstos de manhã
  afternoonExpectedSeconds: number;  // Segundos previstos de tarde
  
  scheduleApplied: ScheduledTimes;   // Horários previstos aplicados
  logs: string[];                     // Logs detalhados de cálculo
}

/**
 * Converte segundos para minutos usando floor (despreza segundos)
 * POLÍTICA ÚNICA: Sempre usar esta função para converter segundos para minutos
 */
function toMinutesFloor(seconds: number): number {
  return Math.floor(seconds / 60);
}

/**
 * Calcula diferença em segundos entre duas datas
 * IMPORTANTE: Ignora segundos das batidas, calcula apenas com horas e minutos
 * Isso garante que 06:55:24 e 06:55:00 sejam tratados como 06:55
 */
function calculateSecondsDifference(start: Date, end: Date): number {
  // Extrair apenas horas e minutos (ignorar segundos)
  const startHours = start.getHours();
  const startMinutes = start.getMinutes();
  const endHours = end.getHours();
  const endMinutes = end.getMinutes();
  
  // Calcular diferença em minutos
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  const diffMinutes = endTotalMinutes - startTotalMinutes;
  
  // Converter para segundos (multiplicar por 60)
  return diffMinutes * 60;
}

/**
 * Converte HH:mm para segundos do dia
 */
function timeToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60;
}

/**
 * Calcula horas trabalhadas (em segundos) pelos intervalos reais
 * IMPORTANTE: Calcula em segundos e NÃO trunca por turno
 */
function calculateWorkedTime(punches: PunchTimes): {
  morningSeconds: number;
  afternoonSeconds: number;
  totalSeconds: number;
} {
  let morningSeconds = 0;
  let afternoonSeconds = 0;

  // Período manhã: saída almoço - entrada manhã
  if (punches.morningEntry && punches.lunchExit) {
    try {
      const entry = parse(punches.morningEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.lunchExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      const diff = calculateSecondsDifference(entry, exit);
      if (diff > 0) {
        morningSeconds = diff;
      }
    } catch (error) {
      // Ignorar erro
    }
  }

  // Período tarde: saída final - entrada tarde
  if (punches.afternoonEntry && punches.finalExit) {
    try {
      const entry = parse(punches.afternoonEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      const diff = calculateSecondsDifference(entry, exit);
      if (diff > 0) {
        afternoonSeconds = diff;
      }
    } catch (error) {
      // Ignorar erro
    }
  }

  // Jornada parcial (2 batidas): entrada → saída
  // Se não tem manhã nem tarde separados, calcular como jornada única
  if (morningSeconds === 0 && afternoonSeconds === 0) {
    if (punches.morningEntry && punches.finalExit && !punches.lunchExit && !punches.afternoonEntry) {
      // Jornada única manhã
      try {
        const entry = parse(punches.morningEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
        const exit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
        const diff = calculateSecondsDifference(entry, exit);
        if (diff > 0) {
          morningSeconds = diff;
        }
      } catch (error) {
        // Ignorar erro
      }
    } else if (punches.afternoonEntry && punches.finalExit && !punches.morningEntry && !punches.lunchExit) {
      // Jornada única tarde
      try {
        const entry = parse(punches.afternoonEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
        const exit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
        const diff = calculateSecondsDifference(entry, exit);
        if (diff > 0) {
          afternoonSeconds = diff;
        }
      } catch (error) {
        // Ignorar erro
      }
    }
  }

  // IMPORTANTE: Somar em segundos e converter só no final
  return {
    morningSeconds,
    afternoonSeconds,
    totalSeconds: morningSeconds + afternoonSeconds,
  };
}

/**
 * Calcula horas previstas (em segundos) pela escala do dia
 */
function calculateExpectedTime(schedule: ScheduledTimes): {
  morningSeconds: number;
  afternoonSeconds: number;
  totalSeconds: number;
} {
  let morningSeconds = 0;
  let afternoonSeconds = 0;

  // Período manhã previsto
  if (schedule.morningStart && schedule.morningEnd) {
    morningSeconds = timeToSeconds(schedule.morningEnd) - timeToSeconds(schedule.morningStart);
    if (morningSeconds < 0) {
      morningSeconds = 0; // Proteção contra horários inválidos
    }
  }

  // Período tarde previsto
  if (schedule.afternoonStart && schedule.afternoonEnd) {
    afternoonSeconds = timeToSeconds(schedule.afternoonEnd) - timeToSeconds(schedule.afternoonStart);
    if (afternoonSeconds < 0) {
      afternoonSeconds = 0; // Proteção contra horários inválidos
    }
  }

  return {
    morningSeconds,
    afternoonSeconds,
    totalSeconds: morningSeconds + afternoonSeconds,
  };
}

/**
 * Verifica se todas as batidas necessárias estão presentes
 */
function hasAllRequiredPunches(punches: PunchTimes, schedule: ScheduledTimes): boolean {
  const needsMorning = schedule.morningStart && schedule.morningEnd;
  const needsAfternoon = schedule.afternoonStart && schedule.afternoonEnd;

  if (needsMorning && needsAfternoon) {
    // Jornada integral: precisa de 4 batidas
    return !!(punches.morningEntry && punches.lunchExit && punches.afternoonEntry && punches.finalExit);
  } else if (needsMorning) {
    // Jornada parcial manhã: precisa de 2 batidas
    return !!(punches.morningEntry && punches.lunchExit);
  } else if (needsAfternoon) {
    // Jornada parcial tarde: precisa de 2 batidas
    return !!(punches.afternoonEntry && punches.finalExit);
  }

  // Se não tem escala definida, aceitar qualquer batida
  return !!(punches.morningEntry || punches.afternoonEntry);
}

/**
 * Calcula indicadores informativos (atraso, extra, etc.)
 * APENAS de início/fim da jornada
 * NÃO determinam o saldo, são apenas informativos
 */
function calculateIndicators(
  punches: PunchTimes,
  schedule: ScheduledTimes,
  workDate: string
): {
  delayMinutes: number;
  earlyArrivalMinutes: number;
  overtimeMinutes: number;
  earlyExitMinutes: number;
} {
  let delayMinutes = 0;
  let earlyArrivalMinutes = 0;
  let overtimeMinutes = 0;
  let earlyExitMinutes = 0;

  // Identificar primeira entrada e última saída (início/fim da jornada)
  let firstEntry: { time: string; scheduled: string } | null = null;
  let lastExit: { time: string; scheduled: string } | null = null;

  // Primeira entrada (início da jornada)
  if (punches.morningEntry && schedule.morningStart) {
    firstEntry = {
      time: punches.morningEntry,
      scheduled: schedule.morningStart,
    };
  } else if (punches.afternoonEntry && schedule.afternoonStart && !schedule.morningStart) {
    // Se não trabalha de manhã, entrada tarde é a primeira entrada
    firstEntry = {
      time: punches.afternoonEntry,
      scheduled: schedule.afternoonStart,
    };
  }

  // Última saída (fim da jornada)
  if (punches.finalExit && schedule.afternoonEnd) {
    lastExit = {
      time: punches.finalExit,
      scheduled: schedule.afternoonEnd,
    };
  } else if (punches.lunchExit && schedule.morningEnd && !schedule.afternoonStart) {
    // Se não trabalha de tarde, saída almoço é a última saída
    lastExit = {
      time: punches.lunchExit,
      scheduled: schedule.morningEnd,
    };
  }

  // Calcular delta da primeira entrada (início da jornada)
  if (firstEntry) {
    try {
      const real = parse(firstEntry.time, 'yyyy-MM-dd HH:mm:ss', new Date());
      const scheduled = parse(`${workDate} ${firstEntry.scheduled}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      const deltaSeconds = calculateSecondsDifference(scheduled, real);
      const deltaMinutes = toMinutesFloor(deltaSeconds);
      
      if (deltaMinutes > 0) {
        delayMinutes = deltaMinutes;
      } else if (deltaMinutes < 0) {
        earlyArrivalMinutes = Math.abs(deltaMinutes);
      }
    } catch (error) {
      // Ignorar erro
    }
  }

  // Calcular delta da última saída (fim da jornada)
  if (lastExit) {
    try {
      const real = parse(lastExit.time, 'yyyy-MM-dd HH:mm:ss', new Date());
      const scheduled = parse(`${workDate} ${lastExit.scheduled}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      const deltaSeconds = calculateSecondsDifference(scheduled, real);
      const deltaMinutes = toMinutesFloor(deltaSeconds);
      
      if (deltaMinutes > 0) {
        overtimeMinutes = deltaMinutes;
      } else if (deltaMinutes < 0) {
        earlyExitMinutes = Math.abs(deltaMinutes);
      }
    } catch (error) {
      // Ignorar erro
    }
  }

  return {
    delayMinutes,
    earlyArrivalMinutes,
    overtimeMinutes,
    earlyExitMinutes,
  };
}

/**
 * Aplica tolerância CLT (art. 58 §1º + Súmula 366 TST)
 * - Tolerância de 5 minutos por marcação (início/fim da jornada)
 * - Limite máximo de 10 minutos de tolerância no dia
 * 
 * @param deltaStart - Variação em minutos da primeira entrada (pode ser negativo)
 * @param deltaEnd - Variação em minutos da última saída (pode ser negativo)
 * @returns Valores CLT após aplicar tolerância
 */
function applyCltTolerance(
  deltaStart: number,
  deltaEnd: number
): {
  atrasoCltMinutes: number;
  chegadaAntecCltMinutes: number;
  extraCltMinutes: number;
  saidaAntecCltMinutes: number;
  saldoCltMinutes: number;
} {
  // Variação absoluta em cada evento
  const absStart = Math.abs(deltaStart);
  const absEnd = Math.abs(deltaEnd);
  
  // Candidatos a tolerância (máximo 5 min por evento)
  let toleratedStart = Math.min(absStart, 5);
  let toleratedEnd = Math.min(absEnd, 5);
  
  // Soma de tolerados no dia
  let toleratedSum = toleratedStart + toleratedEnd;
  
  // Se excedeu 10 min, remover o excedente
  // Política: remover primeiro da maior variação tolerada
  if (toleratedSum > 10) {
    const excess = toleratedSum - 10;
    
    // Remover primeiro da maior variação tolerada
    if (toleratedStart >= toleratedEnd) {
      // Remover de start primeiro
      if (toleratedStart >= excess) {
        toleratedStart -= excess;
      } else {
        const remaining = excess - toleratedStart;
        toleratedStart = 0;
        toleratedEnd = Math.max(0, toleratedEnd - remaining);
      }
    } else {
      // Remover de end primeiro
      if (toleratedEnd >= excess) {
        toleratedEnd -= excess;
      } else {
        const remaining = excess - toleratedEnd;
        toleratedEnd = 0;
        toleratedStart = Math.max(0, toleratedStart - remaining);
      }
    }
  }
  
  // Calcular o que é computável (chargeable)
  const chargeableStart = absStart - toleratedStart;
  const chargeableEnd = absEnd - toleratedEnd;
  
  // Reaplicar o sinal original
  let atrasoCltMinutes = 0;
  let chegadaAntecCltMinutes = 0;
  let extraCltMinutes = 0;
  let saidaAntecCltMinutes = 0;
  
  if (deltaStart > 0) {
    // Atraso
    atrasoCltMinutes = chargeableStart;
  } else if (deltaStart < 0) {
    // Chegada antecipada
    chegadaAntecCltMinutes = chargeableStart;
  }
  
  if (deltaEnd > 0) {
    // Hora extra
    extraCltMinutes = chargeableEnd;
  } else if (deltaEnd < 0) {
    // Saída antecipada
    saidaAntecCltMinutes = chargeableEnd;
  }
  
  // SALDO_CLT = (extra + chegada_antec) - (atraso + saida_antec)
  const saldoCltMinutes = (extraCltMinutes + chegadaAntecCltMinutes) - (atrasoCltMinutes + saidaAntecCltMinutes);
  
  return {
    atrasoCltMinutes,
    chegadaAntecCltMinutes,
    extraCltMinutes,
    saidaAntecCltMinutes,
    saldoCltMinutes,
  };
}

/**
 * Calcula deltas de início e fim da jornada para CLT
 * 
 * @param punches - Horários das batidas reais
 * @param schedule - Horários previstos
 * @param workDate - Data de trabalho
 * @returns Deltas em minutos (pode ser negativo)
 */
function computeStartEndDeltas(
  punches: PunchTimes,
  schedule: ScheduledTimes,
  workDate: string
): {
  deltaStart: number | null;
  deltaEnd: number | null;
} {
  // Identificar primeira entrada e última saída
  let firstEntry: { time: string; scheduled: string } | null = null;
  let lastExit: { time: string; scheduled: string } | null = null;
  
  // Primeira entrada (início da jornada)
  if (punches.morningEntry && schedule.morningStart) {
    firstEntry = {
      time: punches.morningEntry,
      scheduled: schedule.morningStart,
    };
  } else if (punches.afternoonEntry && schedule.afternoonStart && !schedule.morningStart) {
    // Se não trabalha de manhã, entrada tarde é a primeira entrada
    firstEntry = {
      time: punches.afternoonEntry,
      scheduled: schedule.afternoonStart,
    };
  }
  
  // Última saída (fim da jornada)
  if (punches.finalExit && schedule.afternoonEnd) {
    lastExit = {
      time: punches.finalExit,
      scheduled: schedule.afternoonEnd,
    };
  } else if (punches.lunchExit && schedule.morningEnd && !schedule.afternoonStart) {
    // Se não trabalha de tarde, saída almoço é a última saída
    lastExit = {
      time: punches.lunchExit,
      scheduled: schedule.morningEnd,
    };
  }
  
  // Calcular deltas
  let deltaStart: number | null = null;
  let deltaEnd: number | null = null;
  
  if (firstEntry) {
    try {
      const real = parse(firstEntry.time, 'yyyy-MM-dd HH:mm:ss', new Date());
      const scheduled = parse(`${workDate} ${firstEntry.scheduled}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      const deltaSeconds = calculateSecondsDifference(scheduled, real);
      deltaStart = toMinutesFloor(deltaSeconds);
    } catch (error) {
      // Ignorar erro
    }
  }
  
  if (lastExit) {
    try {
      const real = parse(lastExit.time, 'yyyy-MM-dd HH:mm:ss', new Date());
      const scheduled = parse(`${workDate} ${lastExit.scheduled}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      const deltaSeconds = calculateSecondsDifference(scheduled, real);
      deltaEnd = toMinutesFloor(deltaSeconds);
    } catch (error) {
      // Ignorar erro
    }
  }
  
  return { deltaStart, deltaEnd };
}

/**
 * Calcula excesso de intervalo do almoço
 * IMPORTANTE: Este é um indicador separado, NÃO é atraso
 */
function calculateIntervalExcess(
  punches: PunchTimes,
  schedule: ScheduledTimes,
  workDate: string
): {
  intervalExcessSeconds: number;
  intervalExcessMinutes: number;
} {
  if (!punches.lunchExit || !punches.afternoonEntry || !schedule.morningEnd || !schedule.afternoonStart) {
    return {
      intervalExcessSeconds: 0,
      intervalExcessMinutes: 0,
    };
  }

  try {
    // Intervalo real: entrada tarde - saída almoço
    const lunchExit = parse(punches.lunchExit, 'yyyy-MM-dd HH:mm:ss', new Date());
    const afternoonEntry = parse(punches.afternoonEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
    const intervalRealSeconds = calculateSecondsDifference(lunchExit, afternoonEntry);

    // Intervalo previsto: entrada tarde prevista - saída almoço prevista
    const intervalExpectedSeconds = timeToSeconds(schedule.afternoonStart) - timeToSeconds(schedule.morningEnd);
    
    // Excesso = max(0, real - previsto)
    const excessSeconds = Math.max(0, intervalRealSeconds - intervalExpectedSeconds);
    const excessMinutes = toMinutesFloor(excessSeconds);

    return {
      intervalExcessSeconds: excessSeconds,
      intervalExcessMinutes: excessMinutes,
    };
  } catch (error) {
    return {
      intervalExcessSeconds: 0,
      intervalExcessMinutes: 0,
    };
  }
}

/**
 * Calcula o resumo completo do dia usando modelo: Saldo = HorasTrabalhadas - HorasPrevistas
 * 
 * @param punches - Horários das batidas reais
 * @param schedule - Horários previstos
 * @param workDate - Data de trabalho (formato: 'yyyy-MM-dd')
 * @returns DaySummary com todos os cálculos e logs detalhados
 */
export function computeDaySummaryV2(
  punches: PunchTimes,
  schedule: ScheduledTimes,
  workDate: string
): DaySummary {
  const logs: string[] = [];

  // Verificar se todas as batidas necessárias estão presentes
  const allPunchesPresent = hasAllRequiredPunches(punches, schedule);
  const status: 'OK' | 'INCONSISTENTE' = allPunchesPresent ? 'OK' : 'INCONSISTENTE';

  if (!allPunchesPresent) {
    logs.push(`⚠️ INCONSISTENTE: Faltam batidas necessárias`);
  }

  // ============================================
  // (A) CALCULAR HORAS TRABALHADAS (intervalos reais, em segundos)
  // IMPORTANTE: Calcular em segundos e converter só no final usando função única
  // ============================================
  const worked = calculateWorkedTime(punches);
  // Converter para minutos usando função única (floor para minutos completos)
  const workedMinutes = toMinutesFloor(worked.totalSeconds);
  
  logs.push(`Horas trabalhadas:`);
  logs.push(`  Manhã: ${worked.morningSeconds}s (${toMinutesFloor(worked.morningSeconds)}min)`);
  logs.push(`  Tarde: ${worked.afternoonSeconds}s (${toMinutesFloor(worked.afternoonSeconds)}min)`);
  logs.push(`  Total: ${worked.totalSeconds}s (${workedMinutes}min)`);

  // ============================================
  // (B) CALCULAR HORAS PREVISTAS (pela escala, em segundos)
  // ============================================
  const expected = calculateExpectedTime(schedule);
  // Converter para minutos usando função única (floor para minutos completos)
  const expectedMinutes = toMinutesFloor(expected.totalSeconds);
  
  logs.push(`Horas previstas:`);
  logs.push(`  Manhã: ${expected.morningSeconds}s (${toMinutesFloor(expected.morningSeconds)}min)`);
  logs.push(`  Tarde: ${expected.afternoonSeconds}s (${toMinutesFloor(expected.afternoonSeconds)}min)`);
  logs.push(`  Total: ${expected.totalSeconds}s (${expectedMinutes}min)`);

  // ============================================
  // (C) CALCULAR SALDO (trabalhadas - previstas)
  // IMPORTANTE: Usar os minutos já calculados (não recalcular de segundos)
  // ============================================
  const balanceSeconds = worked.totalSeconds - expected.totalSeconds;
  // Saldo em minutos = workedMinutes - expectedMinutes (usar valores já calculados)
  const balanceMinutes = workedMinutes - expectedMinutes;
  
  logs.push(`Saldo: ${balanceSeconds}s (${balanceMinutes}min) = ${workedMinutes}min trabalhadas - ${expectedMinutes}min previstas`);
  if (balanceMinutes > 0) {
    logs.push(`  Saldo positivo: ${balanceMinutes}min a mais trabalhadas`);
  } else if (balanceMinutes < 0) {
    logs.push(`  Saldo negativo: ${Math.abs(balanceMinutes)}min a menos trabalhadas`);
  } else {
    logs.push(`  Saldo zerado`);
  }

  // ============================================
  // (D) CALCULAR INDICADORES INFORMATIVOS (apenas início/fim da jornada)
  // NÃO determinam o saldo, são apenas informativos
  // ============================================
  const indicators = calculateIndicators(punches, schedule, workDate);
  
  logs.push(`Indicadores informativos (início/fim da jornada, não afetam saldo):`);
  logs.push(`  Atraso na entrada: ${indicators.delayMinutes}min`);
  logs.push(`  Chegada antecipada: ${indicators.earlyArrivalMinutes}min`);
  logs.push(`  Hora extra na saída: ${indicators.overtimeMinutes}min`);
  logs.push(`  Saída antecipada: ${indicators.earlyExitMinutes}min`);

  // ============================================
  // (E) CALCULAR EXCESSO DE INTERVALO (indicador separado, NÃO é atraso)
  // ============================================
  const intervalExcess = calculateIntervalExcess(punches, schedule, workDate);
  
  if (intervalExcess.intervalExcessSeconds > 0) {
    logs.push(`⚠️ Excesso de intervalo do almoço: ${intervalExcess.intervalExcessSeconds}s (${intervalExcess.intervalExcessMinutes}min)`);
    logs.push(`  (Este é um indicador separado, NÃO é atraso)`);
  }

  // ============================================
  // (F) CALCULAR VALORES CLT (art. 58 §1º + Súmula 366 TST)
  // Tolerância: 5 min por marcação, máximo 10 min no dia (apenas início/fim da jornada)
  // ============================================
  const { deltaStart, deltaEnd } = computeStartEndDeltas(punches, schedule, workDate);
  
  let atrasoCltMinutes = 0;
  let chegadaAntecCltMinutes = 0;
  let extraCltMinutes = 0;
  let saidaAntecCltMinutes = 0;
  let saldoCltMinutes = 0;
  
  if (deltaStart !== null && deltaEnd !== null) {
    const cltValues = applyCltTolerance(deltaStart, deltaEnd);
    atrasoCltMinutes = cltValues.atrasoCltMinutes;
    chegadaAntecCltMinutes = cltValues.chegadaAntecCltMinutes;
    extraCltMinutes = cltValues.extraCltMinutes;
    saidaAntecCltMinutes = cltValues.saidaAntecCltMinutes;
    saldoCltMinutes = cltValues.saldoCltMinutes;
    
    logs.push(`Cálculo CLT (art. 58 §1º + Súmula 366 TST):`);
    logs.push(`  Delta início: ${deltaStart}min, Delta fim: ${deltaEnd}min`);
    logs.push(`  ATRASO_CLT: ${atrasoCltMinutes}min`);
    logs.push(`  CHEGADA_ANTEC_CLT: ${chegadaAntecCltMinutes}min`);
    logs.push(`  EXTRA_CLT: ${extraCltMinutes}min`);
    logs.push(`  SAIDA_ANTEC_CLT: ${saidaAntecCltMinutes}min`);
    logs.push(`  SALDO_CLT: ${saldoCltMinutes}min (para fins de pagamento/banco de horas legal)`);
  }

  if (status === 'INCONSISTENTE') {
    logs.push(`⚠️ Status INCONSISTENTE: Cálculos podem estar incompletos`);
  }

  return {
    status,
    workedSeconds: worked.totalSeconds,
    workedMinutes,
    expectedSeconds: expected.totalSeconds,
    expectedMinutes,
    balanceSeconds,
    balanceMinutes, // Saldo GERENCIAL (worked - expected)
    delayMinutes: indicators.delayMinutes,
    earlyArrivalMinutes: indicators.earlyArrivalMinutes,
    overtimeMinutes: indicators.overtimeMinutes,
    earlyExitMinutes: indicators.earlyExitMinutes,
    intervalExcessSeconds: intervalExcess.intervalExcessSeconds,
    intervalExcessMinutes: intervalExcess.intervalExcessMinutes,
    // Valores CLT (após tolerância legal)
    atrasoCltMinutes,
    chegadaAntecCltMinutes,
    extraCltMinutes,
    saidaAntecCltMinutes,
    saldoCltMinutes, // SALDO_CLT (para fins de pagamento/banco de horas legal)
    morningWorkedSeconds: worked.morningSeconds,
    afternoonWorkedSeconds: worked.afternoonSeconds,
    morningExpectedSeconds: expected.morningSeconds,
    afternoonExpectedSeconds: expected.afternoonSeconds,
    scheduleApplied: schedule,
    logs,
  };
}
