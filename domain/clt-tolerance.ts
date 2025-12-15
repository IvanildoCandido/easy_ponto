/**
 * Lógica de tolerância CLT (art. 58 §1º)
 * 
 * REGRA LEGAL (Art. 58, § 1º da CLT):
 * - Tolerância de 5 minutos por batida (entrada ou saída)
 * - Se diferença <= 5 minutos (para mais ou para menos), considera como 0
 * - Se diferença > 5 minutos, considera o tempo TOTAL da diferença (não apenas o excedente)
 * - Teto diário: Se soma total das variações estiver entre -10 e +10 minutos, zera o saldo do dia
 * - Se ultrapassar o teto, considera o valor TOTAL calculado
 * 
 * Tratamento do Resultado Final:
 * - Banco de Horas: Faz netting (soma saldo líquido: positivos - negativos)
 * - Pagamento em Folha: Separa extras (para pagamento com adicional) de faltas/atrasos (para desconto)
 */

import { calculateSecondsDifference, toMinutesFloor } from './time-utils';
import { parse } from 'date-fns';

// Constantes conforme Art. 58 §1º CLT
const TOLERANCE_PER_PUNCH_MINUTES = 5; // 5 minutos por batida
const TOLERANCE_DAILY_RANGE_MINUTES = 10; // -10 a +10 minutos (teto diário)

/**
 * Tipo de compensação do funcionário
 */
export type CompensationType = 'BANCO_DE_HORAS' | 'PAGAMENTO_FOLHA';

/**
 * Resultado do cálculo CLT após aplicar tolerâncias
 */
export interface CltToleranceResult {
  // Valores brutos por batida (após regra dos 5 minutos)
  atrasoBrutoMinutes: number; // Atrasos considerados (após tolerância de 5min por batida)
  chegadaAntecBrutoMinutes: number; // Chegadas antecipadas consideradas
  extraBrutoMinutes: number; // Extras considerados
  saidaAntecBrutoMinutes: number; // Saídas antecipadas consideradas
  
  // Soma total do dia (antes do teto de 10 minutos)
  saldoBrutoDia: number; // Soma total: (extra + chegada_antec) - (atraso + saida_antec)
  
  // Valores finais após teto diário de 10 minutos
  atrasoCltMinutes: number; // Atraso CLT final (após teto)
  chegadaAntecCltMinutes: number; // Chegada antecipada CLT final
  extraCltMinutes: number; // Hora extra CLT final (após teto)
  saidaAntecCltMinutes: number; // Saída antecipada CLT final
  
  // Saldo final conforme tipo de compensação
  saldoCltMinutes: number; // Para Banco de Horas: saldo líquido. Para Pagamento: separado em extra e atraso
  extraParaPagamento?: number; // Apenas para PAGAMENTO_FOLHA: minutos de hora extra para pagamento
  faltaParaDesconto?: number; // Apenas para PAGAMENTO_FOLHA: minutos de falta/atraso para desconto
  
  // Logs explicativos
  logs: string[];
}

/**
 * Aplica tolerância CLT conforme Art. 58 §1º
 * 
 * PASSO 1: Regra dos 5 minutos por batida
 * - Se |diferença| <= 5min: considera 0
 * - Se |diferença| > 5min: considera o TOTAL (não apenas excedente)
 * 
 * PASSO 2: Teto diário de 10 minutos
 * - Se soma total entre -10 e +10: zera tudo
 * - Se ultrapassar: considera o valor TOTAL
 * 
 * PASSO 3: Tratamento conforme tipo de compensação
 * - BANCO_DE_HORAS: netting (positivos - negativos)
 * - PAGAMENTO_FOLHA: separa extras de faltas
 * 
 * @param deltaStart - Diferença em minutos da primeira entrada (pode ser negativo)
 * @param deltaEnd - Diferença em minutos da última saída (pode ser negativo)
 * @param compensationType - Tipo de compensação: 'BANCO_DE_HORAS' ou 'PAGAMENTO_FOLHA'
 * @returns Valores CLT após aplicar todas as tolerâncias e regras
 */
export function applyCltTolerance(
  deltaStart: number,
  deltaEnd: number,
  compensationType: CompensationType = 'BANCO_DE_HORAS'
): CltToleranceResult {
  const logs: string[] = [];
  
  logs.push(`=== CÁLCULO CLT - Art. 58 §1º ===`);
  logs.push(`Delta inicial: entrada=${deltaStart}min, saída=${deltaEnd}min`);
  logs.push(`Tipo de compensação: ${compensationType === 'BANCO_DE_HORAS' ? 'Banco de Horas' : 'Pagamento em Folha'}`);
  
  // ============================================
  // PASSO 1: REGRA DOS 5 MINUTOS POR BATIDA
  // ============================================
  // Se |Δ| <= 5min, considera 0. Se |Δ| > 5min, considera o TOTAL
  
  let atrasoBrutoMinutes = 0;
  let chegadaAntecBrutoMinutes = 0;
  let extraBrutoMinutes = 0;
  let saidaAntecBrutoMinutes = 0;
  
  // Tratar entrada (deltaStart)
  if (deltaStart !== null && deltaStart !== undefined) {
    const absStart = Math.abs(deltaStart);
    
    if (absStart <= TOLERANCE_PER_PUNCH_MINUTES) {
      // Dentro da tolerância: zera
      logs.push(`[REGRA 5min] Entrada: diferença ${deltaStart}min (abs=${absStart}min) <= 5min → ZERA (tolerado)`);
      // Não adiciona nada (já está em 0)
    } else {
      // Fora da tolerância: considera o TOTAL (não apenas excedente)
      logs.push(`[REGRA 5min] Entrada: diferença ${deltaStart}min (abs=${absStart}min) > 5min → considera TOTAL (${deltaStart}min)`);
      
      if (deltaStart > 0) {
        // Atraso
        atrasoBrutoMinutes = deltaStart; // TOTAL, não apenas excedente
      } else {
        // Chegada antecipada (deltaStart < 0)
        chegadaAntecBrutoMinutes = absStart; // TOTAL, não apenas excedente
      }
    }
  }
  
  // Tratar saída (deltaEnd)
  if (deltaEnd !== null && deltaEnd !== undefined) {
    const absEnd = Math.abs(deltaEnd);
    
    if (absEnd <= TOLERANCE_PER_PUNCH_MINUTES) {
      // Dentro da tolerância: zera
      logs.push(`[REGRA 5min] Saída: diferença ${deltaEnd}min (abs=${absEnd}min) <= 5min → ZERA (tolerado)`);
      // Não adiciona nada (já está em 0)
    } else {
      // Fora da tolerância: considera o TOTAL
      logs.push(`[REGRA 5min] Saída: diferença ${deltaEnd}min (abs=${absEnd}min) > 5min → considera TOTAL (${deltaEnd}min)`);
      
      if (deltaEnd > 0) {
        // Hora extra (saída depois do horário)
        extraBrutoMinutes = deltaEnd; // TOTAL, não apenas excedente
      } else {
        // Saída antecipada (deltaEnd < 0)
        saidaAntecBrutoMinutes = absEnd; // TOTAL, não apenas excedente
      }
    }
  }
  
  // Calcular saldo bruto do dia (antes do teto)
  // Saldo = (extras + chegadas antecipadas) - (atrasos + saídas antecipadas)
  const saldoBrutoDia = (extraBrutoMinutes + chegadaAntecBrutoMinutes) - (atrasoBrutoMinutes + saidaAntecBrutoMinutes);
  
  logs.push(`Saldo bruto do dia (antes do teto de 10min): ${saldoBrutoDia}min`);
  logs.push(`  = (${extraBrutoMinutes}min extra + ${chegadaAntecBrutoMinutes}min cheg.antec) - (${atrasoBrutoMinutes}min atraso + ${saidaAntecBrutoMinutes}min saida.antec)`);
  
  // ============================================
  // PASSO 2: TETO DIÁRIO DE 10 MINUTOS
  // ============================================
  // Se soma total entre -10 e +10: zera tudo
  // Se ultrapassar: considera o valor TOTAL
  
  let atrasoCltMinutes = atrasoBrutoMinutes;
  let chegadaAntecCltMinutes = chegadaAntecBrutoMinutes;
  let extraCltMinutes = extraBrutoMinutes;
  let saidaAntecCltMinutes = saidaAntecBrutoMinutes;
  
  if (saldoBrutoDia >= -TOLERANCE_DAILY_RANGE_MINUTES && saldoBrutoDia <= TOLERANCE_DAILY_RANGE_MINUTES) {
    // Dentro do teto diário: zera tudo
    logs.push(`[REGRA 10min] Saldo ${saldoBrutoDia}min está entre -10 e +10min → ZERA TUDO (teto diário aplicado)`);
    atrasoCltMinutes = 0;
    chegadaAntecCltMinutes = 0;
    extraCltMinutes = 0;
    saidaAntecCltMinutes = 0;
  } else {
    // Fora do teto: mantém os valores totais
    logs.push(`[REGRA 10min] Saldo ${saldoBrutoDia}min ultrapassa teto de ±10min → mantém valores totais`);
    logs.push(`  ATRASO_CLT: ${atrasoCltMinutes}min`);
    logs.push(`  CHEGADA_ANTEC_CLT: ${chegadaAntecCltMinutes}min`);
    logs.push(`  EXTRA_CLT: ${extraCltMinutes}min`);
    logs.push(`  SAIDA_ANTEC_CLT: ${saidaAntecCltMinutes}min`);
  }
  
  // ============================================
  // PASSO 3: TRATAMENTO CONFORME TIPO DE COMPENSAÇÃO
  // ============================================
  
  let saldoCltMinutes = 0;
  let extraParaPagamento: number | undefined = undefined;
  let faltaParaDesconto: number | undefined = undefined;
  
  if (compensationType === 'BANCO_DE_HORAS') {
    // BANCO DE HORAS: Faz netting (soma saldo líquido)
    saldoCltMinutes = (extraCltMinutes + chegadaAntecCltMinutes) - (atrasoCltMinutes + saidaAntecCltMinutes);
    logs.push(`[BANCO DE HORAS] Saldo líquido: ${saldoCltMinutes}min (${extraCltMinutes + chegadaAntecCltMinutes}min positivos - ${atrasoCltMinutes + saidaAntecCltMinutes}min negativos)`);
  } else {
    // PAGAMENTO EM FOLHA: Separa extras de faltas (NÃO faz netting)
    // Extras: para pagamento com adicional
    extraParaPagamento = extraCltMinutes + chegadaAntecCltMinutes;
    // Faltas/atrasos: para desconto
    faltaParaDesconto = atrasoCltMinutes + saidaAntecCltMinutes;
    // Saldo é zero para pagamento (não há netting)
    saldoCltMinutes = 0;
    
    logs.push(`[PAGAMENTO EM FOLHA] NÃO faz netting - valores separados:`);
    logs.push(`  Hora Extra para pagamento: ${extraParaPagamento}min (${extraCltMinutes}min extra + ${chegadaAntecCltMinutes}min cheg.antec)`);
    logs.push(`  Falta/Atraso para desconto: ${faltaParaDesconto}min (${atrasoCltMinutes}min atraso + ${saidaAntecCltMinutes}min saida.antec)`);
  }
  
  return {
    // Valores brutos (após regra dos 5min)
    atrasoBrutoMinutes,
    chegadaAntecBrutoMinutes,
    extraBrutoMinutes,
    saidaAntecBrutoMinutes,
    saldoBrutoDia,
    
    // Valores finais CLT (após teto de 10min)
    atrasoCltMinutes,
    chegadaAntecCltMinutes,
    extraCltMinutes,
    saidaAntecCltMinutes,
    saldoCltMinutes,
    
    // Valores para pagamento (apenas se PAGAMENTO_FOLHA)
    extraParaPagamento,
    faltaParaDesconto,
    
    logs,
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
  
  // Calcular deltas em minutos inteiros
  let deltaStart: number | null = null;
  let deltaEnd: number | null = null;
  
  if (firstEntry) {
    try {
      const real = parse(firstEntry.time, 'yyyy-MM-dd HH:mm:ss', new Date());
      const scheduled = parse(`${workDate} ${firstEntry.scheduled}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      // Delta = real - scheduled (em minutos)
      // Positivo = atraso (real > scheduled)
      // Negativo = antecipação (real < scheduled)
      const deltaSeconds = calculateSecondsDifference(scheduled, real);
      deltaStart = toMinutesFloor(deltaSeconds); // Usar floor para trabalhar com minutos inteiros
    } catch (error) {
      // Ignorar erro
    }
  }
  
  if (lastExit) {
    try {
      const real = parse(lastExit.time, 'yyyy-MM-dd HH:mm:ss', new Date());
      const scheduled = parse(`${workDate} ${lastExit.scheduled}:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      // Delta = real - scheduled (em minutos)
      // Positivo = saída depois do horário (hora extra)
      // Negativo = saída antes do horário (saída antecipada)
      const deltaSeconds = calculateSecondsDifference(scheduled, real);
      deltaEnd = toMinutesFloor(deltaSeconds); // Usar floor para trabalhar com minutos inteiros
    } catch (error) {
      // Ignorar erro
    }
  }
  
  return { deltaStart, deltaEnd };
}
