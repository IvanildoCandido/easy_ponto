/**
 * API para gerenciar horários excepcionais (schedule_overrides)
 * Permite configurar horários diferentes para datas específicas
 * Exemplo: Sábado completo em uma semana, meio expediente em outra
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '../../../infrastructure/database';
import { ScheduleOverride } from '../../../lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schedule-overrides
 * Lista horários excepcionais
 * Query params:
 *   - employeeId: Filtrar por funcionário específico
 *   - startDate: Data inicial (opcional, formato: yyyy-MM-dd)
 *   - endDate: Data final (opcional, formato: yyyy-MM-dd)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let sql = `
      SELECT 
        so.*,
        e.name as employee_name,
        e.en_no
      FROM schedule_overrides so
      JOIN employees e ON so.employee_id = e.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (employeeId) {
      sql += ` AND so.employee_id = $${params.length + 1}`;
      params.push(parseInt(employeeId));
    }
    
    if (startDate) {
      sql += ` AND so.date >= $${params.length + 1}`;
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ` AND so.date <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    sql += ` ORDER BY so.date DESC, e.name`;
    
    const overrides = await query(sql, params);
    
    return NextResponse.json(overrides);
  } catch (error: any) {
    console.error('[GET /api/schedule-overrides] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/schedule-overrides
 * Cria ou atualiza um horário excepcional
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScheduleOverride = await request.json();
    
    // Validar campos obrigatórios
    if (!body.employee_id || !body.date) {
      return NextResponse.json(
        { error: 'employee_id e date são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Validar formato da data (yyyy-MM-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use yyyy-MM-dd' },
        { status: 400 }
      );
    }
    
    // Verificar se funcionário existe
    const employee = await queryOne(
      `SELECT id FROM employees WHERE id = $1`,
      [body.employee_id]
    );
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se já existe override para esta data e funcionário
    const existing = await queryOne(
      `SELECT id FROM schedule_overrides WHERE employee_id = $1 AND date = $2`,
      [body.employee_id, body.date]
    );
    
    if (existing) {
      // Atualizar existente
      await query(
        `
          UPDATE schedule_overrides 
          SET 
            morning_start = $1,
            morning_end = $2,
            afternoon_start = $3,
            afternoon_end = $4,
            shift_type = $5,
            break_minutes = $6,
            interval_tolerance_minutes = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = $8 AND date = $9
        `,
        [
          body.morning_start || null,
          body.morning_end || null,
          body.afternoon_start || null,
          body.afternoon_end || null,
          body.shift_type || null,
          body.break_minutes || null,
          body.interval_tolerance_minutes || null,
          body.employee_id,
          body.date,
        ]
      );
      
      return NextResponse.json({ 
        message: 'Horário excepcional atualizado com sucesso',
        id: existing.id
      });
    } else {
      // Criar novo
      const result = await query(
        `
          INSERT INTO schedule_overrides 
            (employee_id, date, morning_start, morning_end, afternoon_start, afternoon_end, 
             shift_type, break_minutes, interval_tolerance_minutes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `,
        [
          body.employee_id,
          body.date,
          body.morning_start || null,
          body.morning_end || null,
          body.afternoon_start || null,
          body.afternoon_end || null,
          body.shift_type || null,
          body.break_minutes || null,
          body.interval_tolerance_minutes || null,
        ]
      );
      
      return NextResponse.json({ 
        message: 'Horário excepcional criado com sucesso',
        id: result[0].id
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('[POST /api/schedule-overrides] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedule-overrides
 * Remove um horário excepcional
 * Query params:
 *   - employeeId: ID do funcionário
 *   - date: Data (formato: yyyy-MM-dd)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    
    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'employeeId e date são obrigatórios' },
        { status: 400 }
      );
    }
    
    await query(
      `DELETE FROM schedule_overrides WHERE employee_id = $1 AND date = $2`,
      [parseInt(employeeId), date]
    );
    
    return NextResponse.json({ 
      message: 'Horário excepcional removido com sucesso' 
    });
  } catch (error: any) {
    console.error('[DELETE /api/schedule-overrides] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}










