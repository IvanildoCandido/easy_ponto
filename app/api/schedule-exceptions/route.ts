import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/infrastructure/database';
import { WorkScheduleException } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schedule-exceptions
 * Busca exceções de escala
 * Query params:
 *   - employeeId: ID do funcionário (opcional)
 *   - date: Data específica (opcional, formato: YYYY-MM-DD)
 *   - startDate: Data inicial para busca por período (opcional)
 *   - endDate: Data final para busca por período (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let sql = `
      SELECT se.*, e.name as employee_name, e.en_no
      FROM work_schedule_exceptions se
      JOIN employees e ON se.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (employeeId) {
      sql += ` AND se.employee_id = $${paramIndex}`;
      params.push(parseInt(employeeId));
      paramIndex++;
    }
    
    if (date) {
      sql += ` AND se.date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    if (startDate) {
      sql += ` AND se.date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      sql += ` AND se.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    sql += ` ORDER BY e.name, se.date DESC`;
    
    const exceptions = await query(sql, params);
    return NextResponse.json(exceptions);
  } catch (error: any) {
    console.error('Erro ao buscar exceções de escala:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/schedule-exceptions
 * Cria ou atualiza uma exceção de escala para uma data específica
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      employee_id, 
      date, 
      morning_start, 
      morning_end, 
      afternoon_start, 
      afternoon_end, 
      shift_type, 
      break_minutes, 
      interval_tolerance_minutes 
    } = body;
    
    if (!employee_id || !date) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: employee_id, date' },
        { status: 400 }
      );
    }
    
    // Validar formato da data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    // Usar INSERT ... ON CONFLICT DO UPDATE para criar ou atualizar
    const result = await query(
      `
        INSERT INTO work_schedule_exceptions 
          (employee_id, date, morning_start, morning_end, afternoon_start, afternoon_end, 
           shift_type, break_minutes, interval_tolerance_minutes, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (employee_id, date) DO UPDATE SET
          morning_start = EXCLUDED.morning_start,
          morning_end = EXCLUDED.morning_end,
          afternoon_start = EXCLUDED.afternoon_start,
          afternoon_end = EXCLUDED.afternoon_end,
          shift_type = EXCLUDED.shift_type,
          break_minutes = EXCLUDED.break_minutes,
          interval_tolerance_minutes = EXCLUDED.interval_tolerance_minutes,
          updated_at = NOW()
        RETURNING *
      `,
      [
        employee_id,
        date,
        morning_start || null,
        morning_end || null,
        afternoon_start || null,
        afternoon_end || null,
        shift_type || 'FULL_DAY',
        break_minutes || null,
        interval_tolerance_minutes || null,
      ]
    );
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar/atualizar exceção de escala:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedule-exceptions
 * Deleta uma exceção de escala
 * Query params:
 *   - employeeId: ID do funcionário (obrigatório)
 *   - date: Data da exceção (obrigatório, formato: YYYY-MM-DD)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    
    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: employeeId, date' },
        { status: 400 }
      );
    }
    
    await query(
      `
        DELETE FROM work_schedule_exceptions 
        WHERE employee_id = $1 AND date = $2
      `,
      [parseInt(employeeId), date]
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar exceção de escala:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

