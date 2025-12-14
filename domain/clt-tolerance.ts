/**
 * Lógica de tolerância CLT (art. 58 §1º + Súmula 366 TST)
 * 
 * REGRA LEGAL:
 * - Tolerância de 5 minutos por evento de JORNADA (zona neutra)
 * - Teto diário de 10 minutos de tolerância total
 * - Se exceder 10 min no dia, o excedente deve ser computado
 */

import { calculateSecondsDifference, toMinutesFloor } from './time-utils';
import { parse } from 'date-fns';

const TOLERANCE_PER_EVENT_MINUTES = 5;
const TOLERANCE_DAILY_CAP_MINUTES = 10;

export interface CltToleranceResult {
  atrasoCltMinutes: number;
  chegadaAntecCltMinutes: number;
  extraCltMinutes: number;
  saidaAntecCltMinutes: number;
  saldoCltMinutes: number;
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
export function applyCltTolerance(
  deltaStart: number,
  deltaEnd: number
): CltToleranceResult {
  // Variação absoluta em cada evento
  const absStart = Math.abs(deltaStart);
  const absEnd = Math.abs(deltaEnd);
  
  // Candidatos a tolerância (máximo 5 min por evento)
  // Se |Δ| ≤ 5, tolera |Δ|. Se |Δ| > 5, tolera apenas 5
  let toleratedStart = Math.min(absStart, TOLERANCE_PER_EVENT_MINUTES);
  let toleratedEnd = Math.min(absEnd, TOLERANCE_PER_EVENT_MINUTES);
  
  // Soma de tolerados no dia (antes de aplicar teto)
  let toleratedSum = toleratedStart + toleratedEnd;
  
  // Se excedeu 10 min, remover o excedente
  // Política: remover primeiro da maior variação tolerada
  if (toleratedSum > TOLERANCE_DAILY_CAP_MINUTES) {
    const excess = toleratedSum - TOLERANCE_DAILY_CAP_MINUTES;
    
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
  // REGRA CLT: Se |Δ| ≤ 5, chargeable = 0 (tudo tolerado)
  //            Se |Δ| > 5, chargeable = |Δ| - tolerated (excedente após tolerância)
  // Após aplicar teto diário, pode haver recuperação de tolerados
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
 * @param singleShiftInfo - Informações sobre turno único (opcional)
 * @returns Deltas em minutos (pode ser negativo)
 */
export function computeStartEndDeltas(
  punches: {
    morningEntry: string | null;
    lunchExit: string | null;
    afternoonEntry: string | null;
    finalExit: string | null;
  },
  schedule: {
    morningStart: string | null;
    morningEnd: string | null;
    afternoonStart: string | null;
    afternoonEnd: string | null;
  },
  workDate: string,
  singleShiftInfo?: { shiftType: 'MORNING_ONLY' | 'AFTERNOON_ONLY'; breakMinutes: number }
): {
  deltaStart: number | null;
  deltaEnd: number | null;
} {
  // Identificar primeira entrada e última saída
  let firstEntry: { time: string; scheduled: string } | null = null;
  let lastExit: { time: string; scheduled: string } | null = null;
  
  // TURNO ÚNICO: primeira entrada sempre é morningEntry (1ª batida), última saída sempre é finalExit (4ª batida)
  if (singleShiftInfo) {
    if (singleShiftInfo.shiftType === 'MORNING_ONLY') {
      // Turno único manhã: entrada é morningEntry, comparar com morningStart; saída é finalExit, comparar com afternoonEnd
      if (punches.morningEntry && schedule.morningStart) {
        firstEntry = {
          time: punches.morningEntry,
          scheduled: schedule.morningStart,
        };
      }
      if (punches.finalExit && schedule.afternoonEnd) {
        lastExit = {
          time: punches.finalExit,
          scheduled: schedule.afternoonEnd,
        };
      }
    } else if (singleShiftInfo.shiftType === 'AFTERNOON_ONLY') {
      // Turno único tarde: entrada é morningEntry (1ª batida), comparar com afternoonStart; saída é finalExit, comparar com afternoonEnd
      if (punches.morningEntry && schedule.afternoonStart) {
        firstEntry = {
          time: punches.morningEntry,
          scheduled: schedule.afternoonStart,
        };
      }
      if (punches.finalExit && schedule.afternoonEnd) {
        lastExit = {
          time: punches.finalExit,
          scheduled: schedule.afternoonEnd,
        };
      }
    }
  } else {
    // JORNADA COMPLETA: lógica padrão
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
  }
  
  // Calcular deltas
  let deltaStart: number | null = null;
  let deltaEnd: number | null = null;
  
  if (firstEntry) {
    try {
      const real = parse(firstEntry.time, 'yyyy-MM-dd HH:mm:ss', new Date());
      const scheduled = parse(`${workDate} ${firstEntry.scheduled}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      // Delta = real - scheduled
      // Positivo = atraso (real > scheduled)
      // Negativo = antecipação (real < scheduled)
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
      // Delta = real - scheduled
      // Positivo = saída depois do horário (hora extra)
      // Negativo = saída antes do horário (saída antecipada)
      const deltaSeconds = calculateSecondsDifference(scheduled, real);
      deltaEnd = toMinutesFloor(deltaSeconds);
    } catch (error) {
      // Ignorar erro
    }
  }
  
  return { deltaStart, deltaEnd };
}

