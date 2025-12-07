/**
 * Funções puras para cálculos de ponto conforme CLT Art. 58 §1º e Súmula 366 TST
 * 
 * REGRA LEGAL:
 * - Tolerância de 5 minutos por evento de JORNADA (zona neutra)
 * - Teto diário de 10 minutos de tolerância total
 * - Se exceder 10 min no dia, o excedente deve ser computado
 * 
 * SEPARAÇÃO CLARA:
 * (A) Horas trabalhadas: calcular pelos intervalos reais (sem tolerância)
 * (B) Atraso/Hora extra: aplicar tolerância CLT apenas em eventos de JORNADA (início/fim do dia)
 * 
 * EVENTOS DE JORNADA (para tolerância CLT):
 * - Jornada integral (4 batidas): início = entrada manhã, fim = saída tarde
 * - Jornada parcial (2 batidas): início = entrada, fim = saída
 * - Saída almoço e entrada tarde NÃO são eventos de jornada para tolerância CLT
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

export type EventType = 'morningEntry' | 'lunchExit' | 'afternoonEntry' | 'finalExit';
export type ToleranceMode = 'ONLY_START_END' | 'ALL_SCHEDULED_MARKS';

export interface TimeEvent {
  type: EventType;
  scheduledTime: string | null;      // HH:mm - Horário previsto
  realTime: string | null;           // yyyy-MM-dd HH:mm:ss - Horário real
  rawDelta: number;                  // Δ bruto em minutos (pode ser negativo)
  toleratedMinutes: number;          // Minutos tolerados (0 se |Δ| > 5, ou |Δ| se <= 5)
  chargeableMinutes: number;         // Minutos computáveis (0 se |Δ| <= 5, ou |Δ| se > 5)
  isTolerated: boolean;              // Se está dentro da tolerância individual
  sign: number;                      // 1 (positivo/atraso/extra) ou -1 (negativo/antecipado)
  isJourneyEvent: boolean;            // Se é evento de jornada (início/fim) ou intervalo
}

export interface DaySummary {
  status: 'OK' | 'INCONSISTENTE';
  workedMinutes: number;              // Total de minutos trabalhados (intervalos reais)
  delayMinutes: number;               // Atraso total em minutos (apenas eventos de jornada)
  earlyArrivalMinutes: number;        // Chegada antecipada total em minutos
  overtimeMinutes: number;            // Hora extra total em minutos (apenas eventos de jornada)
  earlyExitMinutes: number;           // Saída antecipada total em minutos
  balanceMinutes: number;            // Saldo do dia em minutos
  events: TimeEvent[];                // Todos os eventos do dia
  toleratedSum: number;              // Soma dos minutos tolerados (apenas eventos de jornada)
  toleratedSumAfterCap: number;       // Soma após aplicar teto de 10 min
  scheduleApplied: ScheduledTimes;   // Horários previstos aplicados
  logs: string[];                     // Logs detalhados de cálculo
}

const TOLERANCE_PER_EVENT_MINUTES = 5;
const TOLERANCE_DAILY_CAP_MINUTES = 10;

/**
 * Calcula diferença em minutos usando apenas horas e minutos (ignora segundos completamente)
 */
function calculateMinutesDifference(start: Date, end: Date): number {
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const endHour = end.getHours();
  const endMinute = end.getMinutes();
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Processa um evento individual aplicando tolerância de 5 minutos
 * REGRA: Ou tolera inteiro (|Δ| <= 5) ou computa inteiro (|Δ| > 5)
 */
function processEvent(
  type: EventType,
  realTime: string | null,
  scheduledTime: string | null,
  workDate: string,
  isJourneyEvent: boolean = false
): TimeEvent | null {
  if (!realTime || !scheduledTime) {
    return null;
  }

  try {
    const real = parse(realTime, 'yyyy-MM-dd HH:mm:ss', new Date());
    const scheduled = parse(`${workDate} ${scheduledTime}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
    
    const rawDelta = calculateMinutesDifference(scheduled, real);
    const absDelta = Math.abs(rawDelta);
    const sign = rawDelta > 0 ? 1 : rawDelta < 0 ? -1 : 0;
    
    // REGRA CLT: Se |Δ| <= 5, tolera inteiro. Se |Δ| > 5, computa inteiro
    if (absDelta <= TOLERANCE_PER_EVENT_MINUTES) {
      // Dentro da tolerância: zona neutra
      return {
        type,
        scheduledTime,
        realTime,
        rawDelta,
        toleratedMinutes: absDelta,      // Tolerado inteiro
        chargeableMinutes: 0,            // Não computa
        isTolerated: true,
        sign,
        isJourneyEvent,
      };
    } else {
      // Fora da tolerância: computa inteiro
      return {
        type,
        scheduledTime,
        realTime,
        rawDelta,
        toleratedMinutes: 0,             // Não tolerado
        chargeableMinutes: absDelta,     // Computa inteiro
        isTolerated: false,
        sign,
        isJourneyEvent,
      };
    }
  } catch (error) {
    return null;
  }
}

/**
 * Aplica teto diário de 10 minutos de tolerância
 * Se a soma dos tolerados > 10, redistribui o excedente
 * 
 * Política de redistribuição: ordena eventos tolerados do maior para o menor
 * e reverte a tolerância até que a soma fique em 10
 */
function applyDailyToleranceCap(events: TimeEvent[]): {
  adjustedEvents: TimeEvent[];
  toleratedSum: number;
  toleratedSumAfterCap: number;
  recoveredMinutes: number;
} {
  // Filtrar apenas eventos de jornada para o cálculo do teto
  const journeyEvents = events.filter(e => e.isJourneyEvent);
  
  // Calcular soma dos tolerados (apenas eventos de jornada)
  const toleratedSum = journeyEvents.reduce((sum, e) => sum + e.toleratedMinutes, 0);
  
  if (toleratedSum <= TOLERANCE_DAILY_CAP_MINUTES) {
    // Dentro do teto: mantém tudo
    return {
      adjustedEvents: events,
      toleratedSum,
      toleratedSumAfterCap: toleratedSum,
      recoveredMinutes: 0,
    };
  }
  
  // Excedeu o teto: precisa redistribuir
  const excess = toleratedSum - TOLERANCE_DAILY_CAP_MINUTES;
  
  // Criar lista de eventos tolerados ordenados do maior para o menor
  const toleratedEvents = journeyEvents
    .filter(e => e.toleratedMinutes > 0)
    .map((e, idx) => ({ event: e, originalIndex: events.indexOf(e) }))
    .sort((a, b) => b.event.toleratedMinutes - a.event.toleratedMinutes);
  
  // Redistribuir: transformar parte dos tolerados em computáveis
  let remainingExcess = excess;
  const adjustedEvents = [...events];
  
  for (const { event, originalIndex } of toleratedEvents) {
    if (remainingExcess <= 0) break;
    
    const toRecover = Math.min(remainingExcess, event.toleratedMinutes);
    const newTolerated = event.toleratedMinutes - toRecover;
    const newChargeable = event.chargeableMinutes + toRecover;
    
    adjustedEvents[originalIndex] = {
      ...event,
      toleratedMinutes: newTolerated,
      chargeableMinutes: newChargeable,
      isTolerated: newTolerated > 0,
    };
    
    remainingExcess -= toRecover;
  }
  
  const toleratedSumAfterCap = adjustedEvents
    .filter(e => e.isJourneyEvent)
    .reduce((sum, e) => sum + e.toleratedMinutes, 0);
  
  return {
    adjustedEvents,
    toleratedSum,
    toleratedSumAfterCap,
    recoveredMinutes: excess,
  };
}

/**
 * Classifica minutos computáveis em atraso, extra, chegada antecipada, saída antecipada
 * APENAS para eventos de jornada (início/fim do dia)
 */
function classifyChargeableMinutes(events: TimeEvent[]): {
  delayMinutes: number;
  earlyArrivalMinutes: number;
  overtimeMinutes: number;
  earlyExitMinutes: number;
} {
  let delayMinutes = 0;
  let earlyArrivalMinutes = 0;
  let overtimeMinutes = 0;
  let earlyExitMinutes = 0;
  
  // Filtrar apenas eventos de jornada
  const journeyEvents = events.filter(e => e.isJourneyEvent && e.chargeableMinutes > 0);
  
  // Identificar início e fim da jornada
  const startEvents = journeyEvents.filter(e => 
    e.type === 'morningEntry' || 
    (e.type === 'afternoonEntry' && !events.some(ev => ev.type === 'morningEntry' && ev.isJourneyEvent))
  );
  
  const endEvents = journeyEvents.filter(e => 
    e.type === 'finalExit' || 
    (e.type === 'lunchExit' && !events.some(ev => ev.type === 'finalExit' && ev.isJourneyEvent))
  );
  
  for (const event of startEvents) {
    const minutes = event.chargeableMinutes * event.sign; // Preserva sinal
    if (minutes > 0) {
      delayMinutes += minutes; // Atraso
    } else {
      earlyArrivalMinutes += Math.abs(minutes); // Chegada antecipada
    }
  }
  
  for (const event of endEvents) {
    const minutes = event.chargeableMinutes * event.sign; // Preserva sinal
    if (minutes > 0) {
      overtimeMinutes += minutes; // Hora extra
    } else {
      earlyExitMinutes += Math.abs(minutes); // Saída antecipada
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
 * Calcula intervalos trabalhados (manhã e tarde)
 * Horas trabalhadas = intervalos reais (sem tolerância)
 */
function computeIntervals(punches: PunchTimes): { morningMinutes: number; afternoonMinutes: number; totalMinutes: number } {
  let morningMinutes = 0;
  let afternoonMinutes = 0;

  if (punches.morningEntry && punches.lunchExit) {
    try {
      const entry = parse(punches.morningEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.lunchExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      const diff = calculateMinutesDifference(entry, exit);
      if (diff > 0) {
        morningMinutes = diff;
      }
    } catch (error) {
      // Ignorar erro
    }
  }

  if (punches.afternoonEntry && punches.finalExit) {
    try {
      const entry = parse(punches.afternoonEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      const diff = calculateMinutesDifference(entry, exit);
      if (diff > 0) {
        afternoonMinutes = diff;
      }
    } catch (error) {
      // Ignorar erro
    }
  }

  // Jornada parcial (2 batidas): entrada e saída
  // Caso 1: Jornada manhã (entrada manhã + saída almoço) - já calculado acima
  // Caso 2: Jornada tarde (entrada tarde + saída final) - já calculado acima
  // Caso 3: Jornada única (entrada + saída, sem almoço)
  if (punches.morningEntry && punches.finalExit && !punches.lunchExit && !punches.afternoonEntry) {
    // Jornada única manhã
    try {
      const entry = parse(punches.morningEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      const diff = calculateMinutesDifference(entry, exit);
      if (diff > 0) {
        morningMinutes = diff;
      }
    } catch (error) {
      // Ignorar erro
    }
  } else if (punches.afternoonEntry && punches.finalExit && !punches.morningEntry && !punches.lunchExit) {
    // Jornada única tarde
    try {
      const entry = parse(punches.afternoonEntry, 'yyyy-MM-dd HH:mm:ss', new Date());
      const exit = parse(punches.finalExit, 'yyyy-MM-dd HH:mm:ss', new Date());
      const diff = calculateMinutesDifference(entry, exit);
      if (diff > 0) {
        afternoonMinutes = diff;
      }
    } catch (error) {
      // Ignorar erro
    }
  }

  return {
    morningMinutes,
    afternoonMinutes,
    totalMinutes: morningMinutes + afternoonMinutes,
  };
}

/**
 * Verifica se todas as batidas necessárias estão presentes
 */
function hasAllRequiredPunches(punches: PunchTimes, schedule: ScheduledTimes): boolean {
  const needsMorning = schedule.morningStart && schedule.morningEnd;
  const needsAfternoon = schedule.afternoonStart && schedule.afternoonEnd;

  if (needsMorning && needsAfternoon) {
    return !!(punches.morningEntry && punches.lunchExit && punches.afternoonEntry && punches.finalExit);
  } else if (needsMorning) {
    return !!(punches.morningEntry && punches.lunchExit);
  } else if (needsAfternoon) {
    return !!(punches.afternoonEntry && punches.finalExit);
  }

  return !!(punches.morningEntry || punches.afternoonEntry);
}

/**
 * Identifica eventos de jornada (início e fim do dia)
 * Retorna: { startEvent, endEvent }
 */
function identifyJourneyEvents(
  punches: PunchTimes,
  schedule: ScheduledTimes
): {
  startEvent: { type: EventType; realTime: string; scheduledTime: string } | null;
  endEvent: { type: EventType; realTime: string; scheduledTime: string } | null;
} {
  let startEvent: { type: EventType; realTime: string; scheduledTime: string } | null = null;
  let endEvent: { type: EventType; realTime: string; scheduledTime: string } | null = null;

  // Jornada integral (4 batidas): início = entrada manhã, fim = saída tarde
  if (punches.morningEntry && punches.finalExit && schedule.morningStart && schedule.afternoonEnd) {
    startEvent = {
      type: 'morningEntry',
      realTime: punches.morningEntry,
      scheduledTime: schedule.morningStart,
    };
    endEvent = {
      type: 'finalExit',
      realTime: punches.finalExit,
      scheduledTime: schedule.afternoonEnd,
    };
  }
  // Jornada parcial manhã (2 batidas): início = entrada manhã, fim = saída almoço
  else if (punches.morningEntry && punches.lunchExit && schedule.morningStart && schedule.morningEnd && !schedule.afternoonStart && !schedule.afternoonEnd) {
    startEvent = {
      type: 'morningEntry',
      realTime: punches.morningEntry,
      scheduledTime: schedule.morningStart,
    };
    endEvent = {
      type: 'lunchExit',
      realTime: punches.lunchExit,
      scheduledTime: schedule.morningEnd,
    };
  }
  // Jornada parcial tarde (2 batidas): início = entrada tarde, fim = saída tarde
  else if (punches.afternoonEntry && punches.finalExit && schedule.afternoonStart && schedule.afternoonEnd && !schedule.morningStart && !schedule.morningEnd) {
    startEvent = {
      type: 'afternoonEntry',
      realTime: punches.afternoonEntry,
      scheduledTime: schedule.afternoonStart,
    };
    endEvent = {
      type: 'finalExit',
      realTime: punches.finalExit,
      scheduledTime: schedule.afternoonEnd,
    };
  }

  return { startEvent, endEvent };
}

/**
 * Calcula o resumo completo do dia conforme CLT
 * 
 * SEPARAÇÃO CLARA:
 * (A) Horas trabalhadas: calcular pelos intervalos reais (sem tolerância)
 * (B) Atraso/Hora extra: aplicar tolerância CLT apenas em eventos de JORNADA (início/fim do dia)
 * 
 * @param punches - Horários das batidas reais
 * @param schedule - Horários previstos
 * @param workDate - Data de trabalho (formato: 'yyyy-MM-dd')
 * @param mode - Modo de tolerância: ONLY_START_END ou ALL_SCHEDULED_MARKS (ignorado, sempre ONLY_START_END para jornada)
 * @returns DaySummary com todos os cálculos e logs detalhados
 */
export function computeDaySummaryCLT(
  punches: PunchTimes,
  schedule: ScheduledTimes,
  workDate: string,
  mode: ToleranceMode = 'ONLY_START_END'
): DaySummary {
  const logs: string[] = [];
  const events: TimeEvent[] = [];

  // Verificar se todas as batidas necessárias estão presentes
  const allPunchesPresent = hasAllRequiredPunches(punches, schedule);
  const status: 'OK' | 'INCONSISTENTE' = allPunchesPresent ? 'OK' : 'INCONSISTENTE';

  if (!allPunchesPresent) {
    logs.push(`⚠️ INCONSISTENTE: Faltam batidas necessárias`);
  }

  // ============================================
  // (A) CALCULAR HORAS TRABALHADAS (intervalos reais, sem tolerância)
  // ============================================
  const intervals = computeIntervals(punches);
  logs.push(`Horas trabalhadas: Manhã=${intervals.morningMinutes}min, Tarde=${intervals.afternoonMinutes}min, Total=${intervals.totalMinutes}min`);

  // ============================================
  // (B) IDENTIFICAR EVENTOS DE JORNADA (início/fim do dia)
  // ============================================
  const { startEvent, endEvent } = identifyJourneyEvents(punches, schedule);
  
  logs.push(`Eventos de jornada identificados:`);
  if (startEvent) {
    logs.push(`  Início: ${startEvent.type} (real=${startEvent.realTime}, previsto=${startEvent.scheduledTime})`);
  }
  if (endEvent) {
    logs.push(`  Fim: ${endEvent.type} (real=${endEvent.realTime}, previsto=${endEvent.scheduledTime})`);
  }

  // ============================================
  // (C) PROCESSAR EVENTOS DE JORNADA (com tolerância CLT)
  // ============================================
  if (startEvent) {
    const event = processEvent(startEvent.type, startEvent.realTime, startEvent.scheduledTime, workDate, true);
    if (event) events.push(event);
  }

  if (endEvent) {
    const event = processEvent(endEvent.type, endEvent.realTime, endEvent.scheduledTime, workDate, true);
    if (event) events.push(event);
  }

  // ============================================
  // (D) REGISTRAR EVENTOS DE INTERVALO (para auditoria, mas NÃO para tolerância CLT)
  // ============================================
  // Saída almoço e entrada tarde são registradas para auditoria, mas NÃO entram no cálculo de tolerância CLT
  if (punches.lunchExit && schedule.morningEnd && !endEvent) {
    // Só registrar se não for evento de fim de jornada
    const event = processEvent('lunchExit', punches.lunchExit, schedule.morningEnd, workDate, false);
    if (event) events.push(event);
  }

  if (punches.afternoonEntry && schedule.afternoonStart && !startEvent) {
    // Só registrar se não for evento de início de jornada
    const event = processEvent('afternoonEntry', punches.afternoonEntry, schedule.afternoonStart, workDate, false);
    if (event) events.push(event);
  }

  // Logs dos eventos processados
  logs.push(`Modo de tolerância: ONLY_START_END (apenas eventos de jornada)`);
  events.forEach(event => {
    const timeStr = event.realTime ? new Date(event.realTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
    const scheduledStr = event.scheduledTime || '-';
    const journeyLabel = event.isJourneyEvent ? '[JORNADA]' : '[INTERVALO]';
    logs.push(`${journeyLabel} Evento ${event.type}: real=${timeStr}, previsto=${scheduledStr}, Δ=${event.rawDelta}min, tolerado=${event.toleratedMinutes}min, computável=${event.chargeableMinutes}min`);
  });

  // ============================================
  // (E) APLICAR TETO DIÁRIO DE 10 MINUTOS (apenas eventos de jornada)
  // ============================================
  const { adjustedEvents, toleratedSum, toleratedSumAfterCap, recoveredMinutes } = applyDailyToleranceCap(events);
  
  logs.push(`Soma tolerados (jornada): ${toleratedSum}min`);
  if (toleratedSum > TOLERANCE_DAILY_CAP_MINUTES) {
    logs.push(`⚠️ Excedeu teto de ${TOLERANCE_DAILY_CAP_MINUTES}min! Excedente: ${recoveredMinutes}min recuperado para computável`);
    logs.push(`Soma tolerados após teto: ${toleratedSumAfterCap}min`);
  }

  // ============================================
  // (F) CLASSIFICAR MINUTOS COMPUTÁVEIS (apenas eventos de jornada)
  // ============================================
  const { delayMinutes, earlyArrivalMinutes, overtimeMinutes, earlyExitMinutes } = classifyChargeableMinutes(adjustedEvents);
  
  logs.push(`Classificação (jornada): Atraso=${delayMinutes}min, Antecipada=${earlyArrivalMinutes}min, Extra=${overtimeMinutes}min, Saída Antecipada=${earlyExitMinutes}min`);

  // ============================================
  // (G) CALCULAR SALDO
  // ============================================
  const balanceMinutes = (overtimeMinutes + earlyArrivalMinutes) - (delayMinutes + earlyExitMinutes);
  logs.push(`Saldo: ${balanceMinutes}min (Extra:${overtimeMinutes} + Antec:${earlyArrivalMinutes} - Atraso:${delayMinutes} - Saída Antec:${earlyExitMinutes})`);

  if (status === 'INCONSISTENTE') {
    logs.push(`⚠️ Status INCONSISTENTE: Cálculos podem estar incompletos`);
  }

  return {
    status,
    workedMinutes: intervals.totalMinutes,
    delayMinutes,
    earlyArrivalMinutes,
    overtimeMinutes,
    earlyExitMinutes,
    balanceMinutes,
    events: adjustedEvents,
    toleratedSum,
    toleratedSumAfterCap,
    scheduleApplied: schedule,
    logs,
  };
}
