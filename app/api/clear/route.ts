import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Limpar todas as tabelas (em ordem para respeitar foreign keys)
    await query('DELETE FROM processed_records');
    await query('DELETE FROM time_records');
    await query('DELETE FROM work_schedules');
    await query('DELETE FROM employees');
    
    // Verificar contagens após limpeza
    const processedCountRows = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM processed_records'
    );
    const timeRecordsCountRows = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM time_records'
    );
    const schedulesCountRows = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM work_schedules'
    );
    const employeesCountRows = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM employees'
    );
    
    const processedCount = parseInt(processedCountRows[0]?.count || '0', 10);
    const timeRecordsCount = parseInt(timeRecordsCountRows[0]?.count || '0', 10);
    const schedulesCount = parseInt(schedulesCountRows[0]?.count || '0', 10);
    const employeesCount = parseInt(employeesCountRows[0]?.count || '0', 10);
    
    return NextResponse.json({
      success: true,
      message: 'Banco de dados zerado com sucesso',
      remaining: {
        processed_records: processedCount,
        time_records: timeRecordsCount,
        work_schedules: schedulesCount,
        employees: employeesCount
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Mesma funcionalidade do POST
  return POST(request);
}



