import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/infrastructure/database';
import { logger } from '@/infrastructure/logger';
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month'); // formato: YYYY-MM
    
    if (!employeeId || !month) {
      return NextResponse.json(
        { error: 'employeeId e month são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Buscar dados do funcionário
    const employee = await queryOne<any>('SELECT * FROM employees WHERE id = $1', [
      parseInt(employeeId),
    ]);
    if (!employee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }
    
    // Calcular início e fim do mês
    const monthDate = parse(month, 'yyyy-MM', new Date());
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    
    
    // Buscar todos os registros do mês
    // A função query() do database.ts já detecta automaticamente se está usando Supabase ou SQLite
    // Para Supabase (Postgres): o campo date é do tipo DATE
    // Para SQLite: será convertido automaticamente pela função convertPostgresToSqlite
    // Query com JOIN para buscar shift_type do schedule
    // Usar sintaxe Postgres - será convertida automaticamente para SQLite se necessário
    // EXTRACT(DOW FROM date) retorna 0-6 (0=Domingo, 1=Segunda, ..., 6=Sábado)
    // work_schedules usa 1=Segunda, então o valor já está correto (só filtrar domingo)
    let reports = (await query(
        `
          SELECT 
          pr.id,
          pr.employee_id,
          pr.date,
          pr.first_entry,
          pr.last_exit,
          pr.morning_entry,
          pr.lunch_exit,
          pr.afternoon_entry,
          pr.final_exit,
          pr.expected_start,
          pr.expected_end,
          pr.delay_seconds,
          pr.early_arrival_seconds,
          pr.overtime_seconds,
          pr.early_exit_seconds,
          pr.worked_minutes,
          pr.expected_minutes,
          pr.balance_seconds,
          pr.interval_excess_seconds,
          pr.atraso_clt_minutes,
          pr.chegada_antec_clt_minutes,
          pr.extra_clt_minutes,
          pr.saida_antec_clt_minutes,
          pr.saldo_clt_minutes,
          pr.status,
          COALESCE(pr.occurrence_type, NULL) as occurrence_type,
          COALESCE(pr.occurrence_morning_entry, false) as occurrence_morning_entry,
          COALESCE(pr.occurrence_lunch_exit, false) as occurrence_lunch_exit,
          COALESCE(pr.occurrence_afternoon_entry, false) as occurrence_afternoon_entry,
          COALESCE(pr.occurrence_final_exit, false) as occurrence_final_exit,
            e.name as employee_name,
          e.department,
          ws.shift_type,
          ws.break_minutes,
          ce.event_type as calendar_event_type,
          ce.description as calendar_event_description
          FROM processed_records pr
          JOIN employees e ON pr.employee_id = e.id
        LEFT JOIN work_schedules ws ON ws.employee_id = e.id 
          AND ws.day_of_week = EXTRACT(DOW FROM pr.date)
          AND EXTRACT(DOW FROM pr.date) BETWEEN 1 AND 6
        LEFT JOIN calendar_events ce ON ce.date = pr.date
          WHERE pr.employee_id = $1 
          AND pr.date >= $2
          AND pr.date <= $3
          ORDER BY pr.date ASC
        `,
        [parseInt(employeeId), startDate, endDate]
      )) as any[];
    
    // Buscar eventos do calendário que não têm registros processados e adicionar
    const useSupabase = !!process.env.SUPABASE_DB_URL;
    let calendarEventsSql: string;
    if (useSupabase) {
      calendarEventsSql = `
        SELECT 
          ce.date,
          ce.event_type as calendar_event_type,
          ce.description as calendar_event_description
        FROM calendar_events ce
        WHERE ce.date >= $1::date AND ce.date <= $2::date
          AND ce.applies_to_all_employees = true
          AND NOT EXISTS (
            SELECT 1 FROM processed_records pr 
            WHERE pr.employee_id = $3 AND pr.date = ce.date
          )
      `;
    } else {
      calendarEventsSql = `
        SELECT 
          ce.date,
          ce.event_type as calendar_event_type,
          ce.description as calendar_event_description
        FROM calendar_events ce
        WHERE date(ce.date) >= $1 AND date(ce.date) <= $2
          AND ce.applies_to_all_employees = 1
          AND NOT EXISTS (
            SELECT 1 FROM processed_records pr 
            WHERE pr.employee_id = $3 AND date(pr.date) = date(ce.date)
          )
      `;
    }
    
    const calendarOnlyReports = (await query(calendarEventsSql, [startDate, endDate, parseInt(employeeId)])) as any[];
    
    // Adicionar eventos do calendário como registros "fantasma" para o PDF
    for (const eventReport of calendarOnlyReports) {
      let dateStr: string;
      if (eventReport.date instanceof Date) {
        dateStr = format(eventReport.date, 'yyyy-MM-dd');
      } else if (typeof eventReport.date === 'string') {
        dateStr = eventReport.date.split('T')[0];
      } else {
        dateStr = String(eventReport.date || '');
      }
      
      reports.push({
        id: null,
        employee_id: parseInt(employeeId),
        date: dateStr,
        first_entry: null,
        last_exit: null,
        morning_entry: null,
        lunch_exit: null,
        afternoon_entry: null,
        final_exit: null,
        expected_start: null,
        expected_end: null,
        delay_seconds: 0,
        early_arrival_seconds: 0,
        overtime_seconds: 0,
        early_exit_seconds: 0,
        worked_minutes: 0,
        expected_minutes: 0,
        balance_seconds: 0,
        interval_excess_seconds: 0,
        atraso_clt_minutes: 0,
        chegada_antec_clt_minutes: 0,
        extra_clt_minutes: 0,
        saida_antec_clt_minutes: 0,
        saldo_clt_minutes: 0,
        status: 'OK',
        occurrence_type: null,
        occurrence_morning_entry: false,
        occurrence_lunch_exit: false,
        occurrence_afternoon_entry: false,
        occurrence_final_exit: false,
        employee_name: reports[0]?.employee_name || '',
        department: reports[0]?.department || '',
        shift_type: null,
        break_minutes: null,
        calendar_event_type: eventReport.calendar_event_type,
        calendar_event_description: eventReport.calendar_event_description,
      });
    }
    
    // Filtrar os resultados para garantir que são do mês correto
    const monthPrefix = month;
    reports = reports.filter(report => {
      let dateStr = report.date;
      if (dateStr instanceof Date) {
        dateStr = format(dateStr, 'yyyy-MM-dd');
      } else if (typeof dateStr === 'string') {
        dateStr = dateStr.substring(0, 10);
      } else {
        dateStr = String(dateStr).substring(0, 10);
      }
      const reportMonth = dateStr.substring(0, 7);
      return reportMonth === monthPrefix;
    });
    
    // Gerar todos os dias do mês
    const allDays = eachDayOfInterval({
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate)
    });
    
    // Criar mapa de registros por data
    // Normalizar as datas para garantir correspondência correta
    const reportsByDate = new Map<string, any>();
    reports.forEach(report => {
      // Normalizar a data do banco para formato yyyy-MM-dd
      let normalizedDate: string | null = null;
      
      if (report.date) {
        // Postgres pode retornar Date object
        if (report.date instanceof Date) {
          normalizedDate = format(report.date, 'yyyy-MM-dd');
        } else {
        const dateStr = String(report.date);
        // Tentar extrair data no formato yyyy-MM-dd
        if (dateStr.length >= 10) {
          normalizedDate = dateStr.substring(0, 10);
        } else {
          // Tentar parsear a data se estiver em outro formato
          try {
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              normalizedDate = format(parsedDate, 'yyyy-MM-dd');
            }
          } catch (e) {
              // Ignorar erro de parsing
            }
          }
        }
      }
      
      if (normalizedDate) {
        reportsByDate.set(normalizedDate, report);
      }
    });
    
    // Função auxiliar para formatar horário
    const formatTime = (timeValue: string | null | undefined): string => {
      if (!timeValue) {
        return '-';
      }
      
      try {
        const timeStr = String(timeValue).trim();
        
        // Se já está no formato HH:mm, retornar diretamente
        if (/^\d{2}:\d{2}$/.test(timeStr)) {
          return timeStr;
        }
        
        // Tentar formatar como datetime
        let dtStr = timeStr;
        
        // Se não tem espaço ou T, pode ser só hora
        if (!dtStr.includes(' ') && !dtStr.includes('T')) {
          // Se tem formato de hora, adicionar data fictícia
          if (/^\d{2}:\d{2}/.test(dtStr)) {
            dtStr = `2000-01-01 ${dtStr}`;
          } else {
            // Tentar extrair HH:mm diretamente
            const match = timeStr.match(/(\d{2}):(\d{2})/);
            if (match) {
              return `${match[1]}:${match[2]}`;
            }
            return '-';
          }
        } else {
          // Substituir espaço por T para ISO format
          dtStr = dtStr.replace(' ', 'T');
        }
        
        const date = new Date(dtStr);
        
        // Verificar se a data é válida
        if (isNaN(date.getTime())) {
          // Fallback: extrair HH:mm diretamente da string
          const match = timeStr.match(/(\d{2}):(\d{2})/);
          if (match) {
            return `${match[1]}:${match[2]}`;
          }
          return '-';
        }
        
        return format(date, 'HH:mm');
      } catch (error) {
        // Fallback: extrair HH:mm diretamente da string
        const match = String(timeValue).match(/(\d{2}):(\d{2})/);
        if (match) {
          return `${match[1]}:${match[2]}`;
        }
        return '-';
      }
    };
    
    // Calcular totais CLT (mesmos campos do modo CLT)
    const totalAtrasoClt = reports.reduce((sum, r) => sum + (r.atraso_clt_minutes || 0), 0);
    const totalExtraClt = reports.reduce((sum, r) => sum + (r.extra_clt_minutes || 0), 0);
    const totalSaldoClt = reports.reduce((sum, r) => sum + (r.saldo_clt_minutes || 0), 0);
    const totalIntervalExcess = reports.reduce((sum, r) => sum + (Math.round((r.interval_excess_seconds || 0) / 60)), 0);
    const totalWorkedMinutes = reports.reduce((sum, r) => sum + (r.worked_minutes || 0), 0);
    const totalExpectedMinutes = reports.reduce((sum, r) => sum + (r.expected_minutes || 0), 0);
    
    // Detectar se há turno único (verificar primeiro report com shift_type)
    const firstReportWithSchedule = reports.find(r => r.shift_type);
    const isSingleShift = firstReportWithSchedule?.shift_type === 'MORNING_ONLY' || firstReportWithSchedule?.shift_type === 'AFTERNOON_ONLY';
    
    // Formatar dados para o PDF
    const pdfData = {
      employee: {
        name: employee.name,
        department: employee.department,
        en_no: employee.en_no
      },
      month: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
      monthYear: format(monthDate, 'MM/yyyy'),
      isSingleShift: isSingleShift || false, // Flag para indicar se é turno único
      shiftType: firstReportWithSchedule?.shift_type || 'FULL_DAY',
      days: allDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const report = reportsByDate.get(dateStr);
        const dayOfWeek = day.getDay();
        const isSunday = dayOfWeek === 0;
        
        return {
          date: format(day, 'dd/MM/yyyy'),
          dayOfWeek: format(day, 'EEE', { locale: ptBR }),
          isSunday,
          status: report?.status || 'OK',
          calendarEventType: report?.calendar_event_type || null,
          calendarEventDescription: report?.calendar_event_description || null,
          occurrenceType: report?.occurrence_type || null,
          occurrenceMorningEntry: report?.occurrence_morning_entry === true || report?.occurrence_morning_entry === 1 || false,
          occurrenceLunchExit: report?.occurrence_lunch_exit === true || report?.occurrence_lunch_exit === 1 || false,
          occurrenceAfternoonEntry: report?.occurrence_afternoon_entry === true || report?.occurrence_afternoon_entry === 1 || false,
          occurrenceFinalExit: report?.occurrence_final_exit === true || report?.occurrence_final_exit === 1 || false,
          morningEntry: formatTime(report?.morning_entry),
          lunchExit: formatTime(report?.lunch_exit),
          afternoonEntry: formatTime(report?.afternoon_entry),
          finalExit: formatTime(report?.final_exit),
          // Campos CLT (mesmos da tabela no modo CLT)
          atrasoClt: report ? (report.atraso_clt_minutes || 0) : 0,
          extraClt: report ? (report.extra_clt_minutes || 0) : 0,
          saldoClt: report ? (report.saldo_clt_minutes || 0) : 0,
          intervalExcess: report ? Math.round((report.interval_excess_seconds || 0) / 60) : 0,
          workedMinutes: report ? (report.worked_minutes || 0) : 0,
          expectedMinutes: report ? (report.expected_minutes || 0) : 0,
        };
      }),
      totals: {
        atrasoClt: totalAtrasoClt,
        extraClt: totalExtraClt,
        saldoClt: totalSaldoClt,
        intervalExcess: totalIntervalExcess,
        workedMinutes: totalWorkedMinutes,
        expectedMinutes: totalExpectedMinutes
      }
    };
    
    
    return NextResponse.json(pdfData);
  } catch (error: any) {
    logger.error('[PDF API] Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function formatWorkedHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

