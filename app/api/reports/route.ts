import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/infrastructure/database';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let sql = `
      SELECT 
        pr.*,
        e.id as employee_id,
        e.en_no,
        e.name as employee_name,
        e.department
      FROM processed_records pr
      JOIN employees e ON pr.employee_id = e.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (employeeId) {
      sql += ' AND pr.employee_id = $' + (params.length + 1);
      params.push(parseInt(employeeId));
    }
    
    if (startDate) {
      sql += ' AND pr.date >= $' + (params.length + 1);
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND pr.date <= $' + (params.length + 1);
      params.push(endDate);
    }
    
    sql += ' ORDER BY pr.date DESC, e.name';
    
    const reports = (await query(sql, params)) as any[];
    
    // Formatar horas trabalhadas e converter segundos para minutos
    const formattedReports = reports.map(report => {
      // Normalizar data para string (Postgres pode retornar Date object)
      let dateStr: string;
      if (report.date instanceof Date) {
        dateStr = report.date.toISOString().split('T')[0];
      } else if (typeof report.date === 'string') {
        dateStr = report.date.split('T')[0]; // Remove hora se houver
      } else {
        dateStr = String(report.date || '');
      }
      
      // Normalizar campos de data/hora para string (Postgres pode retornar Date objects)
      const normalizeDateTime = (dt: any): string | null => {
        if (!dt) return null;
        if (typeof dt === 'string') return dt;
        if (dt instanceof Date) {
          // Formato: yyyy-MM-dd HH:mm:ss
          const year = dt.getFullYear();
          const month = String(dt.getMonth() + 1).padStart(2, '0');
          const day = String(dt.getDate()).padStart(2, '0');
          const hours = String(dt.getHours()).padStart(2, '0');
          const minutes = String(dt.getMinutes()).padStart(2, '0');
          const seconds = String(dt.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
        return String(dt);
      };
      
      return {
        ...report,
        date: dateStr, // Garantir que date seja sempre string
        // Normalizar todos os campos de data/hora
        morning_entry: normalizeDateTime(report.morning_entry),
        lunch_exit: normalizeDateTime(report.lunch_exit),
        afternoon_entry: normalizeDateTime(report.afternoon_entry),
        final_exit: normalizeDateTime(report.final_exit),
        first_entry: normalizeDateTime(report.first_entry),
        last_exit: normalizeDateTime(report.last_exit),
        expected_start: normalizeDateTime(report.expected_start),
        expected_end: normalizeDateTime(report.expected_end),
        worked_hours: formatWorkedHours(report.worked_minutes || 0),
        expected_hours: formatWorkedHours(report.expected_minutes || 0),
        // Converter segundos para minutos e arredondar (sem segundos na exibição)
        delay_minutes: Math.round((report.delay_seconds || 0) / 60),
        early_arrival_minutes: Math.round((report.early_arrival_seconds || 0) / 60),
        overtime_minutes: Math.round((report.overtime_seconds || 0) / 60),
        early_exit_minutes: Math.round((report.early_exit_seconds || 0) / 60),
        // Saldo GERENCIAL = worked_minutes - expected_minutes (usar os mesmos valores já calculados)
        balance_minutes: (report.worked_minutes || 0) - (report.expected_minutes || 0),
        interval_excess_minutes: Math.round((report.interval_excess_seconds || 0) / 60),
        // Valores CLT (já calculados em minutos)
        atraso_clt_minutes: report.atraso_clt_minutes || 0,
        chegada_antec_clt_minutes: report.chegada_antec_clt_minutes || 0,
        extra_clt_minutes: report.extra_clt_minutes || 0,
        saida_antec_clt_minutes: report.saida_antec_clt_minutes || 0,
        saldo_clt_minutes: report.saldo_clt_minutes || 0,
        status: report.status || 'OK', // Incluir status (OK ou INCONSISTENTE)
        occurrence_type: report.occurrence_type || null, // Tipo de ocorrência
        occurrence_hours_minutes: report.occurrence_hours_minutes || null, // Horas da ocorrência em minutos
        occurrence_duration: report.occurrence_duration || null, // Duração (COMPLETA, MEIO_PERIODO, ou null)
        occurrence_morning_entry: report.occurrence_morning_entry || false, // Ocorrência na entrada da manhã
        occurrence_lunch_exit: report.occurrence_lunch_exit || false, // Ocorrência na saída do almoço
        occurrence_afternoon_entry: report.occurrence_afternoon_entry || false, // Ocorrência na entrada da tarde
        occurrence_final_exit: report.occurrence_final_exit || false, // Ocorrência na saída final
      };
    });
    
    return NextResponse.json(formattedReports);
  } catch (error: any) {
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

