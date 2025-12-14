import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/infrastructure/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    
    if (employeeId) {
      const schedules = await query(
        `
          SELECT * FROM work_schedules 
          WHERE employee_id = $1 
          ORDER BY day_of_week
        `,
        [parseInt(employeeId)]
      );
      return NextResponse.json(schedules);
    }
    
    const schedules = await query(
      `
        SELECT ws.*, e.name as employee_name, e.en_no
        FROM work_schedules ws
        JOIN employees e ON ws.employee_id = e.id
        ORDER BY e.name, ws.day_of_week
      `
    );
    
    return NextResponse.json(schedules);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, day_of_week, morning_start, morning_end, afternoon_start, afternoon_end, shift_type, break_minutes } = body;
    
    if (!employee_id || day_of_week === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: employee_id, day_of_week' },
        { status: 400 }
      );
    }
    
    // Normalizar valores vazios para null
    const normalizeTime = (value: any) => {
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return null;
      }
      return value;
    };
    
    const normMorningStart = normalizeTime(morning_start);
    const normMorningEnd = normalizeTime(morning_end);
    const normAfternoonStart = normalizeTime(afternoon_start);
    const normAfternoonEnd = normalizeTime(afternoon_end);
    const normShiftType = shift_type || 'FULL_DAY';
    const normBreakMinutes = break_minutes !== undefined && break_minutes !== null ? parseInt(String(break_minutes)) : null;
    
    // Validar shift_type
    if (normShiftType && !['FULL_DAY', 'MORNING_ONLY', 'AFTERNOON_ONLY'].includes(normShiftType)) {
      return NextResponse.json(
        { error: 'shift_type deve ser FULL_DAY, MORNING_ONLY ou AFTERNOON_ONLY' },
        { status: 400 }
      );
    }
    
    // Validações específicas por tipo de turno
    if (normShiftType === 'FULL_DAY') {
      // Validar que se manhã está preenchido, ambos os campos devem estar
      const hasMorning = normMorningStart && normMorningEnd;
      const hasPartialMorning = (normMorningStart && !normMorningEnd) || (!normMorningStart && normMorningEnd);
      
      if (hasPartialMorning) {
        return NextResponse.json(
          { error: 'Se configurar manhã, é necessário preencher entrada e saída' },
          { status: 400 }
        );
      }
      
      // Validar que se tarde está preenchido, ambos os campos devem estar
      const hasAfternoon = normAfternoonStart && normAfternoonEnd;
      const hasPartialAfternoon = (normAfternoonStart && !normAfternoonEnd) || (!normAfternoonStart && normAfternoonEnd);
      
      if (hasPartialAfternoon) {
        return NextResponse.json(
          { error: 'Se configurar tarde, é necessário preencher entrada e saída' },
          { status: 400 }
        );
      }
    } else if (normShiftType === 'MORNING_ONLY') {
      // Turno único manhã: precisa de morning_start e afternoon_end (saída final)
      if (!normMorningStart || !normAfternoonEnd) {
        return NextResponse.json(
          { error: 'Turno único manhã requer entrada e saída final' },
          { status: 400 }
        );
      }
    } else if (normShiftType === 'AFTERNOON_ONLY') {
      // Turno único tarde: precisa de afternoon_start e afternoon_end
      if (!normAfternoonStart || !normAfternoonEnd) {
        return NextResponse.json(
          { error: 'Turno único tarde requer entrada e saída final' },
          { status: 400 }
        );
      }
    }
    
    // Permitir salvar mesmo sem nenhum período (indica que não trabalha naquele dia)
    
    const result = await queryOne<{ id: number }>(
      `
        INSERT INTO work_schedules (employee_id, day_of_week, morning_start, morning_end, afternoon_start, afternoon_end, shift_type, break_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (employee_id, day_of_week) DO UPDATE SET
          morning_start = EXCLUDED.morning_start,
          morning_end = EXCLUDED.morning_end,
          afternoon_start = EXCLUDED.afternoon_start,
          afternoon_end = EXCLUDED.afternoon_end,
          shift_type = EXCLUDED.shift_type,
          break_minutes = EXCLUDED.break_minutes
        RETURNING id
      `,
      [
        employee_id,
        day_of_week,
        normMorningStart,
        normMorningEnd,
        normAfternoonStart,
        normAfternoonEnd,
        normShiftType,
        normBreakMinutes,
      ]
    );
    
    return NextResponse.json({
      success: true,
      id: result?.id
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }
    
    await query('DELETE FROM work_schedules WHERE id = $1', [parseInt(id)]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

