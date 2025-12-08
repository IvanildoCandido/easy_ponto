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
    // Detectar se estamos usando SQLite ou PostgreSQL
    const isProduction = process.env.NODE_ENV === 'production';
    const useSupabase = isProduction && process.env.SUPABASE_DB_URL;
    
    let reports: any[];
    
    if (useSupabase) {
      // PostgreSQL: usar CAST para comparação de datas
      reports = (await query(
        `
          SELECT 
            pr.*,
            e.name as employee_name,
            e.department
          FROM processed_records pr
          JOIN employees e ON pr.employee_id = e.id
          WHERE pr.employee_id = $1 
            AND CAST(pr.date AS DATE) >= CAST($2 AS DATE) 
            AND CAST(pr.date AS DATE) <= CAST($3 AS DATE)
          ORDER BY pr.date ASC
        `,
        [parseInt(employeeId), startDate, endDate]
      )) as any[];
    } else {
      // SQLite: usar SUBSTR para comparar apenas os primeiros 7 caracteres (YYYY-MM)
      // Isso garante que apenas registros do mês correto sejam retornados
      const monthPattern = month; // "2025-11"
      reports = (await query(
        `
          SELECT 
            pr.*,
            e.name as employee_name,
            e.department
          FROM processed_records pr
          JOIN employees e ON pr.employee_id = e.id
          WHERE pr.employee_id = $1 
            AND SUBSTR(pr.date, 1, 7) = $2
          ORDER BY pr.date ASC
        `,
        [parseInt(employeeId), monthPattern]
      )) as any[];
    }
    
    // Filtrar os resultados para garantir que são do mês correto
    // (proteção adicional caso a query retorne dados incorretos)
    const monthPrefix = month; // "2025-11"
    const reportsBeforeFilter = reports.length;
    reports = reports.filter(report => {
      const reportDate = String(report.date || '').substring(0, 7); // "2025-11" ou "2025-12"
      const matches = reportDate === monthPrefix;
      if (!matches) {
      }
      return matches;
    });
    
    if (reports.length === 0) {
      logger.warn(`[PDF API] Nenhum registro encontrado para employeeId=${employeeId}, month=${month}`);
    }
    
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
            logger.warn(`[PDF API] Erro ao normalizar data: ${dateStr}`, e);
          }
        }
      }
      
      if (normalizedDate) {
        reportsByDate.set(normalizedDate, report);
      }
    });
    
    
    // Função auxiliar para formatar horário
    const formatTime = (timeValue: string | null | undefined, fieldName?: string): string => {
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
    
    // Formatar dados para o PDF
    const pdfData = {
      employee: {
        name: employee.name,
        department: employee.department,
        en_no: employee.en_no
      },
      month: format(monthDate, 'MMMM yyyy', { locale: ptBR }),
      monthYear: format(monthDate, 'MM/yyyy'),
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
          morningEntry: formatTime(report?.morning_entry, 'morning_entry'),
          lunchExit: formatTime(report?.lunch_exit, 'lunch_exit'),
          afternoonEntry: formatTime(report?.afternoon_entry, 'afternoon_entry'),
          finalExit: formatTime(report?.final_exit, 'final_exit'),
          // Campos CLT (mesmos da tabela no modo CLT)
          atrasoClt: report ? (report.atraso_clt_minutes || 0) : 0,
          extraClt: report ? (report.extra_clt_minutes || 0) : 0,
          saldoClt: report ? (report.saldo_clt_minutes || 0) : 0,
          intervalExcess: report ? Math.round((report.interval_excess_seconds || 0) / 60) : 0,
        };
      }),
      totals: {
        atrasoClt: totalAtrasoClt,
        extraClt: totalExtraClt,
        saldoClt: totalSaldoClt,
        intervalExcess: totalIntervalExcess
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

