/**
 * Serviço de cálculo diário de ponto
 * Orquestra a lógica de domínio e acesso a dados
 */

import { query, queryOne } from '../infrastructure/database';
import { parse, format } from 'date-fns';
import { WorkSchedule } from '../lib/types';
import {
  computeDaySummaryV2,
  type PunchTimes,
  type ScheduledTimes,
} from '../domain/time-calculation';
import { logger } from '../infrastructure/logger';

/**
 * Calcula e salva os registros processados de um dia específico
 * 
 * @param date - Data no formato 'yyyy-MM-dd'
 */
export async function calculateDailyRecords(date: string) {
  // Detectar Supabase baseado na existência de SUPABASE_DB_URL
  const useSupabase = !!process.env.SUPABASE_DB_URL;
  
  // Para Postgres, converter datetime de volta para timezone local ao recuperar
  const records = await query<any>(
    useSupabase
      ? `SELECT *, datetime AT TIME ZONE 'America/Sao_Paulo' as datetime_local FROM time_records WHERE DATE(datetime AT TIME ZONE 'America/Sao_Paulo') = $1 ORDER BY employee_id, datetime`
      : `SELECT * FROM time_records WHERE datetime LIKE $1 ORDER BY employee_id, datetime`,
    useSupabase ? [date] : [`${date}%`]
  );
  
  // Agrupar por funcionário
  const byEmployee: { [key: number]: any[] } = {};
  for (const record of records) {
    if (!byEmployee[record.employee_id]) {
      byEmployee[record.employee_id] = [];
    }
    byEmployee[record.employee_id].push(record);
  }
  
  const workDate = parse(date, 'yyyy-MM-dd', new Date());
  
  // Validar se a data é válida
  if (isNaN(workDate.getTime())) {
    logger.error(`Data inválida recebida: ${date}`);
    throw new Error(`Data inválida: ${date}`);
  }
  
  // Converter getDay() (0=Domingo, 1=Segunda, ..., 6=Sábado) para day_of_week do banco (1=Segunda, ..., 6=Sábado)
  // Se for domingo (0), não deve buscar schedule (não tem domingo no banco)
  const jsDayOfWeek = workDate.getDay();
  const dayOfWeek = jsDayOfWeek === 0 ? null : jsDayOfWeek; // null para domingo, 1-6 para segunda-sábado
  
  for (const [employeeId, employeeRecords] of Object.entries(byEmployee)) {
    const empId = parseInt(employeeId);
    
    // Buscar dados do funcionário para obter compensation_type
    const employee = await queryOne<{ compensation_type?: 'BANCO_DE_HORAS' | 'PAGAMENTO_FOLHA' | null }>(
      `SELECT compensation_type FROM employees WHERE id = $1`,
      [empId]
    );
    const compensationType: 'BANCO_DE_HORAS' | 'PAGAMENTO_FOLHA' = 
      (employee?.compensation_type as 'BANCO_DE_HORAS' | 'PAGAMENTO_FOLHA') || 'BANCO_DE_HORAS';
    
    // Normalizar datetime para string (Postgres retorna Date object, SQLite retorna string)
    // Se houver datetime_local (Postgres com timezone), usar ele; senão usar datetime
    const normalizedRecords = employeeRecords.map(record => {
      const dt = record.datetime_local || record.datetime;
      return {
        ...record,
        datetime: typeof dt === 'string' 
          ? dt 
          : format(new Date(dt), 'yyyy-MM-dd HH:mm:ss')
      };
    });
    
    // Ordenar por data/hora
    normalizedRecords.sort((a, b) => 
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
    
    // Remover registros duplicados (mesmo horário exato e mesmo in_out)
    // Manter apenas o primeiro registro de cada combinação única de datetime + in_out
    const uniqueRecords: any[] = [];
    const seenKeys = new Set<string>();
    
    for (const record of normalizedRecords) {
      const key = `${record.datetime}|${record.in_out}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueRecords.push(record);
      }
    }
    
    // Buscar horário de trabalho: primeiro verificar se há exceção para esta data específica
    // Se não houver exceção, usar o horário padrão do dia da semana
    // Se for domingo (dayOfWeek === null), não buscar schedule
    let schedule: WorkSchedule | null = null;
    
    if (dayOfWeek) {
      // Primeiro, tentar buscar override (horário excepcional) para a data específica
      const override = await queryOne<WorkSchedule & { date?: string }>(
        `
          SELECT 
            id,
            employee_id,
            morning_start,
            morning_end,
            afternoon_start,
            afternoon_end,
            shift_type,
            break_minutes,
            interval_tolerance_minutes
          FROM schedule_overrides 
          WHERE employee_id = $1 AND date = $2
        `,
        [empId, date]
      );
      
      if (override) {
        // Usar override encontrado (horário excepcional para esta data específica)
        schedule = {
          id: override.id,
          employee_id: override.employee_id,
          day_of_week: dayOfWeek, // Usar dayOfWeek calculado para compatibilidade
          morning_start: override.morning_start,
          morning_end: override.morning_end,
          afternoon_start: override.afternoon_start,
          afternoon_end: override.afternoon_end,
          shift_type: override.shift_type || null,
          break_minutes: override.break_minutes || null,
          interval_tolerance_minutes: override.interval_tolerance_minutes || null,
        };
        logger.info(`[calculateDailyRecords] Usando schedule override para funcionário ${empId} na data ${date}`);
      } else {
        // Se não houver exceção, usar horário padrão do dia da semana
        schedule = await queryOne<WorkSchedule>(
          `
            SELECT * FROM work_schedules 
            WHERE employee_id = $1 AND day_of_week = $2
          `,
          [empId, dayOfWeek]
        );
      }
    }
    
    // Identificar tipo de turno
    const shiftType = schedule?.shift_type || 'FULL_DAY';
    const breakMinutes = schedule?.break_minutes || null;
    const intervalToleranceMinutes = schedule?.interval_tolerance_minutes || 0; // Tolerância de intervalo (padrão: 0 = sem tolerância)
    const isSingleShift = shiftType === 'MORNING_ONLY' || shiftType === 'AFTERNOON_ONLY';
    
    if (!schedule) {
      logger.warn(`Funcionário ${empId} - ${date}: Nenhum schedule encontrado para este dia`);
      // Pular processamento se não houver schedule (não é possível calcular sem horário previsto)
      continue;
    }
    
    // Processar registros únicos em ordem cronológica para identificar os 4 pontos
    // IMPORTANTE: Agrupar por timestamp único (sem segundos) para pegar a primeira batida de cada horário
    // Mas manter os segundos originais para cálculo preciso
    const timeGroups = new Map<string, any[]>();
    for (const record of uniqueRecords) {
      // Converter datetime para string se necessário (Postgres retorna Date object)
      const datetimeStr = typeof record.datetime === 'string' 
        ? record.datetime 
        : format(new Date(record.datetime), 'yyyy-MM-dd HH:mm:ss');
      
      // Agrupar por hora:minuto (sem segundos) para identificar horários únicos
      // Formato: "2025-12-05 06:55:24" -> "2025-12-05 06:55"
      const timeKey = datetimeStr.substring(0, 16); // "2025-12-05 06:55"
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }
      // Normalizar datetime para string em todos os registros
      timeGroups.get(timeKey)!.push({ ...record, datetime: datetimeStr });
    }
    
    // Para cada grupo de horário, pegar a primeira batida (mais precisa)
    const uniqueByTime: any[] = [];
    for (const [timeKey, records] of timeGroups.entries()) {
      // Ordenar por datetime completo e pegar a primeira (mais antiga)
      const sorted = records.sort((a, b) => 
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );
      uniqueByTime.push(sorted[0]);
    }
    
    // Ordenar por datetime completo
    uniqueByTime.sort((a, b) => 
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
    
    // Buscar correções manuais ANTES de processar batidas do arquivo
    // Se houver correção manual, ela tem prioridade sobre as batidas do arquivo
    const manualCorrection = await queryOne<{
      morning_entry: string | null;
      lunch_exit: string | null;
      afternoon_entry: string | null;
      final_exit: string | null;
    }>(
      `SELECT morning_entry, lunch_exit, afternoon_entry, final_exit
       FROM manual_punch_corrections 
       WHERE employee_id = $1 AND date = $2`,
      [empId, date]
    );
    
    // Buscar ocorrências existentes ANTES de identificar batidas (para usar na lógica inteligente)
    const existingRecord = await queryOne<{
      occurrence_type: string | null;
      occurrence_hours_minutes: number | null;
      occurrence_duration: string | null;
      occurrence_morning_entry: boolean | null;
      occurrence_lunch_exit: boolean | null;
      occurrence_afternoon_entry: boolean | null;
      occurrence_final_exit: boolean | null;
    }>(
      `SELECT occurrence_type, occurrence_hours_minutes, occurrence_duration,
              occurrence_morning_entry, occurrence_lunch_exit, 
              occurrence_afternoon_entry, occurrence_final_exit
       FROM processed_records 
       WHERE employee_id = $1 AND date = $2`,
      [empId, date]
    );
    
    let morningEntry: string | null = null;
    let lunchExit: string | null = null;
    let afternoonEntry: string | null = null;
    let finalExit: string | null = null;
    
    // Se houver correção manual, usar ela diretamente
    if (manualCorrection) {
      logger.info(`[calculateDailyRecords] Usando correção manual para funcionário ${empId} na data ${date}`);
      morningEntry = manualCorrection.morning_entry;
      lunchExit = manualCorrection.lunch_exit;
      afternoonEntry = manualCorrection.afternoon_entry;
      finalExit = manualCorrection.final_exit;
    }
    
    // LÓGICA DE IDENTIFICAÇÃO DE BATIDAS
    // Se NÃO houver correção manual, processar batidas do arquivo
    // Se houver correção manual, usar ela (já foi atribuída acima)
    if (!manualCorrection && uniqueByTime.length >= 1) {
      const punches = uniqueByTime;

      if (isSingleShift && punches.length >= 4) {
        // TURNO ÚNICO: 4 batidas são para o mesmo turno com intervalo
        // IMPORTANTE: Para manter compatibilidade com a estrutura existente, sempre usar:
        // - morningEntry = 1ª batida (Entrada do turno)
        // - lunchExit = 2ª batida (Saída para intervalo)
        // - afternoonEntry = 3ª batida (Entrada pós-intervalo)
        // - finalExit = 4ª batida (Saída final)
        // Isso funciona tanto para MORNING_ONLY quanto AFTERNOON_ONLY
        morningEntry = punches[0].datetime;    // 1ª batida: Entrada do turno
        lunchExit = punches[1].datetime;       // 2ª batida: Saída para intervalo
        afternoonEntry = punches[2].datetime;  // 3ª batida: Entrada pós-intervalo
        finalExit = punches[3].datetime;       // 4ª batida: Saída final
      } else if (punches.length >= 4) {
        // JORNADA COMPLETA: 4 batidas normais
        morningEntry = punches[0].datetime;
        lunchExit = punches[1].datetime;
        afternoonEntry = punches[2].datetime;
        finalExit = punches[3].datetime;
      } else if (punches.length === 3) {
        // TURNO ÚNICO: 3 batidas (falta uma)
        // Sempre mapear na ordem: 1ª=Entrada, 2ª=Saída intervalo, 3ª=Entrada pós-intervalo
        if (isSingleShift) {
          morningEntry = punches[0].datetime;    // 1ª batida: Entrada
          lunchExit = punches[1].datetime;       // 2ª batida: Saída intervalo
          afternoonEntry = punches[2].datetime;  // 3ª batida: Entrada pós-intervalo
        } else {
          // Jornada completa com 3 batidas - precisa determinar qual batida está faltando
          // Analisar os horários para identificar corretamente qual batida falta
          const punch1Time = parse(punches[0].datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
          const punch2Time = parse(punches[1].datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
          const punch3Time = parse(punches[2].datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
          
          const punch1Hour = punch1Time.getHours();
          const punch2Hour = punch2Time.getHours();
          const punch3Hour = punch3Time.getHours();
          
          // Verificar se há ocorrência de esquecimento de batida marcada
          const hasForgottenMorningEntry = existingRecord?.occurrence_morning_entry === true && existingRecord?.occurrence_type === 'ESQUECIMENTO_BATIDA';
          const hasForgottenAfternoonEntry = existingRecord?.occurrence_afternoon_entry === true && existingRecord?.occurrence_type === 'ESQUECIMENTO_BATIDA';
          const hasForgottenLunchExit = existingRecord?.occurrence_lunch_exit === true && existingRecord?.occurrence_type === 'ESQUECIMENTO_BATIDA';
          const hasForgottenFinalExit = existingRecord?.occurrence_final_exit === true && existingRecord?.occurrence_type === 'ESQUECIMENTO_BATIDA';
          
          // Se houver ocorrência marcada, usar ela para determinar qual batida falta
          if (hasForgottenAfternoonEntry) {
            // Entrada tarde esquecida - 3ª batida deve ser a saída final
            morningEntry = punches[0].datetime;
            lunchExit = punches[1].datetime;
            // afternoonEntry = null (esquecida)
            finalExit = punches[2].datetime; // 3ª batida é na verdade a saída final
          } else if (hasForgottenMorningEntry) {
            // Entrada manhã esquecida - provavelmente começou a trabalhar direto
            // 1ª batida seria saída almoço, 2ª entrada tarde, 3ª saída final
            lunchExit = punches[0].datetime;
            afternoonEntry = punches[1].datetime;
            finalExit = punches[2].datetime;
          } else if (hasForgottenLunchExit) {
            // Saída almoço esquecida - 1ª entrada, 2ª entrada tarde, 3ª saída final
            morningEntry = punches[0].datetime;
            afternoonEntry = punches[1].datetime;
            finalExit = punches[2].datetime;
          } else if (hasForgottenFinalExit) {
            // Saída final esquecida - 3 batidas normais
            morningEntry = punches[0].datetime;
            lunchExit = punches[1].datetime;
            afternoonEntry = punches[2].datetime;
          } else {
            // Sem ocorrência marcada, tentar identificar pelo horário
            // Analisar a 3ª batida: se for tarde (após 16h), provavelmente é saída final
            // Se for cedo (13h-14h), provavelmente é entrada tarde
            if (punch3Hour >= 16) {
              // 3ª batida é tarde, provavelmente é a saída final (falta entrada tarde)
              morningEntry = punches[0].datetime;
              lunchExit = punches[1].datetime;
              // afternoonEntry = null (não batida)
              finalExit = punches[2].datetime; // 3ª batida é a saída final
            } else if (punch3Hour >= 12 && punch3Hour < 14) {
              // 3ª batida é por volta de 12h-14h, provavelmente é entrada tarde (falta saída final)
              morningEntry = punches[0].datetime;
              lunchExit = punches[1].datetime;
              afternoonEntry = punches[2].datetime;
              // finalExit = null (não batida)
            } else if (punch1Hour >= 12 && punch1Hour < 14) {
              // 1ª batida é tarde, provavelmente começou direto no almoço
              // 1ª = saída almoço, 2ª = entrada tarde, 3ª = saída final
              lunchExit = punches[0].datetime;
              afternoonEntry = punches[1].datetime;
              finalExit = punches[2].datetime;
            } else {
              // Fallback: mapear sequencialmente (comportamento antigo)
              morningEntry = punches[0].datetime;
              lunchExit = punches[1].datetime;
              afternoonEntry = punches[2].datetime;
            }
          }
        }
      } else if (punches.length === 2) {
        const firstTime = parse(punches[0].datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
        const firstHour = firstTime.getHours();
        
        if (isSingleShift) {
          // Turno único com 2 batidas: 1ª=Entrada, 2ª=Saída final
          morningEntry = punches[0].datetime;
          finalExit = punches[1].datetime;
        } else if (firstHour < 12) {
          // Jornada completa: só manhã
          morningEntry = punches[0].datetime;
          lunchExit = punches[1].datetime;
        } else {
          // Jornada completa: só tarde
          afternoonEntry = punches[0].datetime;
          finalExit = punches[1].datetime;
        }
      } else if (punches.length === 1) {
        const firstTime = parse(punches[0].datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
        const firstHour = firstTime.getHours();
        
        if (isSingleShift) {
          // Turno único com 1 batida: sempre usar morningEntry (será interpretado corretamente)
          morningEntry = punches[0].datetime;
        } else if (firstHour < 12) {
          morningEntry = punches[0].datetime;
        } else {
          afternoonEntry = punches[0].datetime;
        }
      }
    }
    
    // Para compatibilidade, manter firstEntry e lastExit
    const firstEntry = morningEntry || afternoonEntry;
    const lastExit = finalExit || lunchExit;
    
    // Preparar horários previstos
    // Para turno único, ajustar campos conforme o tipo
    let scheduledTimes: ScheduledTimes;
    if (shiftType === 'MORNING_ONLY') {
      // Turno único manhã: usar morning_start como entrada e afternoon_end como saída final
      scheduledTimes = {
        morningStart: schedule?.morning_start || null,
        morningEnd: null, // Não tem saída para almoço em turno único
        afternoonStart: null, // Não tem entrada tarde em turno único
        afternoonEnd: schedule?.afternoon_end || null, // Saída final do turno
      };
    } else if (shiftType === 'AFTERNOON_ONLY') {
      // Turno único tarde: usar afternoon_start como entrada e afternoon_end como saída final
      scheduledTimes = {
        morningStart: null,
        morningEnd: null,
        afternoonStart: schedule?.afternoon_start || null,
        afternoonEnd: schedule?.afternoon_end || null,
      };
    } else {
      // Jornada completa padrão
      scheduledTimes = {
        morningStart: schedule?.morning_start || null,
        morningEnd: schedule?.morning_end || null,
        afternoonStart: schedule?.afternoon_start || null,
        afternoonEnd: schedule?.afternoon_end || null,
      };
    }
    
    // Preparar batidas
    const punchTimes: PunchTimes = {
      morningEntry,
      lunchExit,
      afternoonEntry,
      finalExit,
    };
    
    // Preparar informações de turno único para passar ao cálculo
    // IMPORTANTE: Para turnos únicos, breakMinutes pode ser null mas ainda assim é turno único
    // Se breakMinutes for null, usar 20 como padrão (direito legal mínimo)
    const singleShiftInfoForCalc = isSingleShift
      ? { 
          shiftType: shiftType as 'MORNING_ONLY' | 'AFTERNOON_ONLY', 
          breakMinutes: breakMinutes !== null && breakMinutes !== undefined ? breakMinutes : 20 
        }
      : undefined;
    
    if (isSingleShift) {
      logger.info(`[calculateDailyRecords] Turno único detectado: ${shiftType}, breakMinutes: ${singleShiftInfoForCalc?.breakMinutes}, morningEntry: ${morningEntry}, scheduledAfternoonStart: ${scheduledTimes.afternoonStart}`);
    }
    
    // Calcular usando o novo modelo: Saldo = HorasTrabalhadas - HorasPrevistas
    // Passar compensation_type para aplicar regras corretas (Banco de Horas vs Pagamento)
    const summary = computeDaySummaryV2(punchTimes, scheduledTimes, date, singleShiftInfoForCalc, intervalToleranceMinutes, compensationType);
    
    // Ajustar cálculo se houver ocorrência (existingRecord já foi buscado anteriormente)
    // IMPORTANTE: summary.expectedMinutes já vem do cálculo baseado no schedule (original)
    let adjustedExpectedMinutes = summary.expectedMinutes;
    let adjustedBalanceSeconds = summary.balanceSeconds;
    let adjustedWorkedMinutes = summary.workedMinutes;
    
    if (existingRecord?.occurrence_type) {
      const occurrenceType = existingRecord.occurrence_type;
      const occurrenceDuration = existingRecord.occurrence_duration;
      const occurrenceHoursMinutes = existingRecord.occurrence_hours_minutes;
      
      logger.info(`[calculateDailyRecords] Ajustando cálculo para ocorrência: ${occurrenceType}, duration: ${occurrenceDuration}, hours: ${occurrenceHoursMinutes}, expected_original: ${summary.expectedMinutes}`);
      
      if (occurrenceDuration === 'COMPLETA') {
        // Folga/Falta completa: não espera trabalhar, então expected = 0 e saldo = 0 (não deve ficar devendo)
        adjustedExpectedMinutes = 0;
        adjustedBalanceSeconds = 0; // Saldo zero para folga completa (não deve ficar devendo as horas)
      } else if (occurrenceDuration === 'MEIO_PERIODO') {
        // Meio período: espera metade das horas originais (summary.expectedMinutes já é o valor original do schedule)
        adjustedExpectedMinutes = Math.floor(summary.expectedMinutes / 2);
        adjustedBalanceSeconds = (adjustedWorkedMinutes - adjustedExpectedMinutes) * 60;
      } else if (occurrenceHoursMinutes !== null && occurrenceHoursMinutes !== undefined) {
        // Horas específicas: usar o valor definido
        adjustedExpectedMinutes = occurrenceHoursMinutes;
        adjustedBalanceSeconds = (adjustedWorkedMinutes - adjustedExpectedMinutes) * 60;
      }
      // Se não tiver duration nem hours específicas, mantém o cálculo normal
      
      logger.info(`[calculateDailyRecords] Valores ajustados: expected=${adjustedExpectedMinutes}, balance=${adjustedBalanceSeconds}, worked=${adjustedWorkedMinutes}`);
    }
    
    // Preparar expected_start e expected_end para compatibilidade
    const workDateStr = format(workDate, 'yyyy-MM-dd');
    let expectedStart: string | null = null;
    let expectedEnd: string | null = null;
    
    if (schedule) {
      if (schedule.morning_start) {
        expectedStart = `${workDateStr} ${schedule.morning_start}:00`;
      } else if (schedule.afternoon_start) {
        expectedStart = `${workDateStr} ${schedule.afternoon_start}:00`;
      }
      
      if (schedule.afternoon_end) {
        expectedEnd = `${workDateStr} ${schedule.afternoon_end}:00`;
      } else if (schedule.morning_end) {
        expectedEnd = `${workDateStr} ${schedule.morning_end}:00`;
      }
    }
    
    // Preservar campos de ocorrência se existirem
    const occurrenceType = existingRecord?.occurrence_type || null;
    const occurrenceHoursMinutes = existingRecord?.occurrence_hours_minutes || null;
    const occurrenceDuration = existingRecord?.occurrence_duration || null;
    const occurrenceMorningEntry = existingRecord?.occurrence_morning_entry || false;
    const occurrenceLunchExit = existingRecord?.occurrence_lunch_exit || false;
    const occurrenceAfternoonEntry = existingRecord?.occurrence_afternoon_entry || false;
    const occurrenceFinalExit = existingRecord?.occurrence_final_exit || false;
    
    // Determinar quais batidas são manuais (baseado em correção manual)
    const isManualMorningEntry = !!manualCorrection?.morning_entry;
    const isManualLunchExit = !!manualCorrection?.lunch_exit;
    const isManualAfternoonEntry = !!manualCorrection?.afternoon_entry;
    const isManualFinalExit = !!manualCorrection?.final_exit;
    
    // Salvar no banco
    // O novo modelo usa segundos diretamente, mas o banco ainda armazena alguns campos em segundos
    await query(
      `
        INSERT INTO processed_records 
          (employee_id, date, first_entry, last_exit, morning_entry, lunch_exit, afternoon_entry, final_exit,
           expected_start, expected_end, delay_seconds, early_arrival_seconds, overtime_seconds, 
           early_exit_seconds, worked_minutes, expected_minutes, balance_seconds, interval_excess_seconds,
           atraso_clt_minutes, chegada_antec_clt_minutes, extra_clt_minutes, saida_antec_clt_minutes, saldo_clt_minutes, status,
           occurrence_type, occurrence_hours_minutes, occurrence_duration,
           occurrence_morning_entry, occurrence_lunch_exit, occurrence_afternoon_entry, occurrence_final_exit,
           is_manual_morning_entry, is_manual_lunch_exit, is_manual_afternoon_entry, is_manual_final_exit)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
        ON CONFLICT (employee_id, date) DO UPDATE SET
          first_entry = EXCLUDED.first_entry,
          last_exit = EXCLUDED.last_exit,
          morning_entry = EXCLUDED.morning_entry,
          lunch_exit = EXCLUDED.lunch_exit,
          afternoon_entry = EXCLUDED.afternoon_entry,
          final_exit = EXCLUDED.final_exit,
          expected_start = EXCLUDED.expected_start,
          expected_end = EXCLUDED.expected_end,
          delay_seconds = EXCLUDED.delay_seconds,
          early_arrival_seconds = EXCLUDED.early_arrival_seconds,
          overtime_seconds = EXCLUDED.overtime_seconds,
          early_exit_seconds = EXCLUDED.early_exit_seconds,
          worked_minutes = EXCLUDED.worked_minutes,
          expected_minutes = EXCLUDED.expected_minutes,
          balance_seconds = EXCLUDED.balance_seconds,
          interval_excess_seconds = EXCLUDED.interval_excess_seconds,
          atraso_clt_minutes = EXCLUDED.atraso_clt_minutes,
          chegada_antec_clt_minutes = EXCLUDED.chegada_antec_clt_minutes,
          extra_clt_minutes = EXCLUDED.extra_clt_minutes,
          saida_antec_clt_minutes = EXCLUDED.saida_antec_clt_minutes,
          saldo_clt_minutes = EXCLUDED.saldo_clt_minutes,
          status = EXCLUDED.status,
          occurrence_type = COALESCE(processed_records.occurrence_type, EXCLUDED.occurrence_type),
          occurrence_hours_minutes = COALESCE(processed_records.occurrence_hours_minutes, EXCLUDED.occurrence_hours_minutes),
          occurrence_duration = COALESCE(processed_records.occurrence_duration, EXCLUDED.occurrence_duration),
          occurrence_morning_entry = COALESCE(processed_records.occurrence_morning_entry, EXCLUDED.occurrence_morning_entry),
          occurrence_lunch_exit = COALESCE(processed_records.occurrence_lunch_exit, EXCLUDED.occurrence_lunch_exit),
          occurrence_afternoon_entry = COALESCE(processed_records.occurrence_afternoon_entry, EXCLUDED.occurrence_afternoon_entry),
          occurrence_final_exit = COALESCE(processed_records.occurrence_final_exit, EXCLUDED.occurrence_final_exit),
          is_manual_morning_entry = EXCLUDED.is_manual_morning_entry,
          is_manual_lunch_exit = EXCLUDED.is_manual_lunch_exit,
          is_manual_afternoon_entry = EXCLUDED.is_manual_afternoon_entry,
          is_manual_final_exit = EXCLUDED.is_manual_final_exit
      `,
      [
        empId,
        date,
        firstEntry,
        lastExit,
        morningEntry,
        lunchExit,
        afternoonEntry,
        finalExit,
        expectedStart,
        expectedEnd,
        summary.delayMinutes * 60, // Indicador informativo (em segundos)
        summary.earlyArrivalMinutes * 60, // Indicador informativo (em segundos)
        summary.overtimeMinutes * 60, // Indicador informativo (em segundos)
        summary.earlyExitMinutes * 60, // Indicador informativo (em segundos)
        adjustedWorkedMinutes, // Minutos trabalhados (ajustado se houver ocorrência)
        adjustedExpectedMinutes, // Minutos previstos (ajustado se houver ocorrência)
        adjustedBalanceSeconds, // Saldo em segundos (ajustado se houver ocorrência)
        summary.intervalExcessSeconds, // Excesso de intervalo (em segundos, indicador separado)
        summary.atrasoCltMinutes, // Atraso CLT (após tolerância)
        summary.chegadaAntecCltMinutes, // Chegada antecipada CLT (após tolerância)
        summary.extraCltMinutes, // Hora extra CLT (após tolerância)
        summary.saidaAntecCltMinutes, // Saída antecipada CLT (após tolerância)
        summary.saldoCltMinutes, // SALDO_CLT (para fins de pagamento/banco de horas legal)
        summary.status,
        occurrenceType,
        occurrenceHoursMinutes,
        occurrenceDuration,
        occurrenceMorningEntry, // $28
        occurrenceLunchExit, // $29
        occurrenceAfternoonEntry, // $30
        occurrenceFinalExit, // $31
        isManualMorningEntry, // $32
        isManualLunchExit, // $33
        isManualAfternoonEntry, // $34
        isManualFinalExit, // $35
      ]
    );
  }
}

