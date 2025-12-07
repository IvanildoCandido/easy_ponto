import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/infrastructure/database';
import { format } from 'date-fns';

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
    const formattedReports = reports.map(report => ({
      ...report,
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
    }));
    
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

