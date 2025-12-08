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
  // Para SQLite, usar LIKE; para Postgres, usar DATE()
  const isProduction = process.env.NODE_ENV === 'production';
  const useSupabase = isProduction && process.env.SUPABASE_DB_URL;
  
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
  // Converter getDay() (0=Domingo, 1=Segunda, ..., 6=Sábado) para day_of_week do banco (1=Segunda, ..., 6=Sábado)
  // Se for domingo (0), não deve buscar schedule (não tem domingo no banco)
  const jsDayOfWeek = workDate.getDay();
  const dayOfWeek = jsDayOfWeek === 0 ? null : jsDayOfWeek; // null para domingo, 1-6 para segunda-sábado
  
  for (const [employeeId, employeeRecords] of Object.entries(byEmployee)) {
    const empId = parseInt(employeeId);
    
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
    
    // Buscar horário de trabalho primeiro para identificar corretamente os pontos
    // Se for domingo (dayOfWeek === null), não buscar schedule
    const schedule = dayOfWeek
      ? await queryOne<WorkSchedule>(
          `
            SELECT * FROM work_schedules 
            WHERE employee_id = $1 AND day_of_week = $2
          `,
          [empId, dayOfWeek]
        )
      : null;
    
    if (!schedule) {
      logger.warn(`Funcionário ${empId} - ${date}: Nenhum schedule encontrado para este dia`);
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
    
    let morningEntry: string | null = null;
    let lunchExit: string | null = null;
    let afternoonEntry: string | null = null;
    let finalExit: string | null = null;
    
    // NOVA LÓGICA (simplificada, ignorando completamente In/Out):
    // - Se houver 4 ou mais batidas no dia:
    //      1ª  -> Entrada Manhã
    //      2ª  -> Saída Almoço
    //      3ª  -> Entrada Tarde
    //      4ª  -> Saída Tarde
    // - Se houver exatamente 2 batidas:
    //      se 1ª < 12h  -> Entrada Manhã / Saída Almoço
    //      se 1ª >= 12h -> Entrada Tarde / Saída Tarde
    // - Se houver 3 batidas:
    //      1ª -> Entrada Manhã
    //      2ª -> Saída Almoço
    //      3ª -> Entrada Tarde  (sem saída registrada)
    // - Se houver 1 batida:
    //      se < 12h  -> Entrada Manhã
    //      se >= 12h -> Entrada Tarde
    if (uniqueByTime.length >= 1) {
      const punches = uniqueByTime;

      if (punches.length >= 4) {
        morningEntry = punches[0].datetime;
        lunchExit = punches[1].datetime;
        afternoonEntry = punches[2].datetime;
        finalExit = punches[3].datetime;
      } else if (punches.length === 3) {
        morningEntry = punches[0].datetime;
        lunchExit = punches[1].datetime;
        afternoonEntry = punches[2].datetime;
      } else if (punches.length === 2) {
        const firstTime = parse(punches[0].datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
        const firstHour = firstTime.getHours();
        
        if (firstHour < 12) {
          // Só manhã
          morningEntry = punches[0].datetime;
          lunchExit = punches[1].datetime;
        } else {
          // Só tarde
          afternoonEntry = punches[0].datetime;
          finalExit = punches[1].datetime;
        }
      } else if (punches.length === 1) {
        const firstTime = parse(punches[0].datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
        const firstHour = firstTime.getHours();
        
        if (firstHour < 12) {
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
    const scheduledTimes: ScheduledTimes = {
      morningStart: schedule?.morning_start || null,
      morningEnd: schedule?.morning_end || null,
      afternoonStart: schedule?.afternoon_start || null,
      afternoonEnd: schedule?.afternoon_end || null,
    };
    
    // Preparar batidas
    const punchTimes: PunchTimes = {
      morningEntry,
      lunchExit,
      afternoonEntry,
      finalExit,
    };
    
    // Calcular usando o novo modelo: Saldo = HorasTrabalhadas - HorasPrevistas
    const summary = computeDaySummaryV2(punchTimes, scheduledTimes, date);
    
    
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
    
    // Salvar no banco
    // O novo modelo usa segundos diretamente, mas o banco ainda armazena alguns campos em segundos
    await query(
      `
        INSERT INTO processed_records 
          (employee_id, date, first_entry, last_exit, morning_entry, lunch_exit, afternoon_entry, final_exit,
           expected_start, expected_end, delay_seconds, early_arrival_seconds, overtime_seconds, 
           early_exit_seconds, worked_minutes, expected_minutes, balance_seconds, interval_excess_seconds,
           atraso_clt_minutes, chegada_antec_clt_minutes, extra_clt_minutes, saida_antec_clt_minutes, saldo_clt_minutes, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
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
          status = EXCLUDED.status
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
        summary.workedMinutes, // Minutos trabalhados (floor de segundos/60) - VALOR CORRETO
        summary.expectedMinutes, // Minutos previstos (floor de segundos/60)
        summary.balanceSeconds, // Saldo em segundos (trabalhadas - previstas)
        summary.intervalExcessSeconds, // Excesso de intervalo (em segundos, indicador separado)
        summary.atrasoCltMinutes, // Atraso CLT (após tolerância)
        summary.chegadaAntecCltMinutes, // Chegada antecipada CLT (após tolerância)
        summary.extraCltMinutes, // Hora extra CLT (após tolerância)
        summary.saidaAntecCltMinutes, // Saída antecipada CLT (após tolerância)
        summary.saldoCltMinutes, // SALDO_CLT (para fins de pagamento/banco de horas legal)
        summary.status,
      ]
    );
  }
}

