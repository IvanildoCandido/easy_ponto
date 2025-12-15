import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/infrastructure/database';
import { calculateDailyRecords } from '@/application/daily-calculation-service';
import { logger } from '@/infrastructure/logger';
import { parse, format, isValid } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * GET: Buscar correção manual de batidas para um funcionário em uma data específica
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'employeeId e date são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar formato de data
    const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (!isValid(parsedDate)) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use yyyy-MM-dd' },
        { status: 400 }
      );
    }

    const correction = await queryOne<{
      id: number;
      employee_id: number;
      date: string;
      morning_entry: string | null;
      lunch_exit: string | null;
      afternoon_entry: string | null;
      final_exit: string | null;
      corrected_by: string | null;
      correction_reason: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, employee_id, date, morning_entry, lunch_exit, afternoon_entry, final_exit,
              corrected_by, correction_reason, created_at, updated_at
       FROM manual_punch_corrections
       WHERE employee_id = $1 AND date = $2`,
      [parseInt(employeeId), date]
    );

    // Buscar batidas originais do time_records
    const useSupabase = !!process.env.SUPABASE_DB_URL;
    const originalRecords = await query<any>(
      useSupabase
        ? `SELECT datetime, in_out FROM time_records 
           WHERE employee_id = $1 
           AND DATE(datetime AT TIME ZONE 'America/Sao_Paulo') = $2 
           ORDER BY datetime`
        : `SELECT datetime, in_out FROM time_records 
           WHERE employee_id = $1 
           AND datetime LIKE $2 
           ORDER BY datetime`,
      useSupabase ? [parseInt(employeeId), date] : [parseInt(employeeId), `${date}%`]
    );

    // Processar batidas originais: identificar as 4 batidas
    let originalMorningEntry: string | null = null;
    let originalLunchExit: string | null = null;
    let originalAfternoonEntry: string | null = null;
    let originalFinalExit: string | null = null;

    if (originalRecords && originalRecords.length > 0) {
      // Normalizar datetime para string
      const normalizedRecords = originalRecords.map((record: any) => {
        const dt = record.datetime;
        return {
          ...record,
          datetime: typeof dt === 'string' 
            ? dt 
            : format(new Date(dt), 'yyyy-MM-dd HH:mm:ss')
        };
      });

      // Ordenar por datetime
      normalizedRecords.sort((a: any, b: any) => 
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
      );

      // Identificar batidas (assumindo ordem: entrada manhã, saída almoço, entrada tarde, saída final)
      if (normalizedRecords.length >= 4) {
        originalMorningEntry = normalizedRecords[0].datetime;
        originalLunchExit = normalizedRecords[1].datetime;
        originalAfternoonEntry = normalizedRecords[2].datetime;
        originalFinalExit = normalizedRecords[3].datetime;
      } else if (normalizedRecords.length === 3) {
        originalMorningEntry = normalizedRecords[0].datetime;
        originalLunchExit = normalizedRecords[1].datetime;
        originalAfternoonEntry = normalizedRecords[2].datetime;
      } else if (normalizedRecords.length === 2) {
        originalMorningEntry = normalizedRecords[0].datetime;
        originalLunchExit = normalizedRecords[1].datetime;
      } else if (normalizedRecords.length === 1) {
        originalMorningEntry = normalizedRecords[0].datetime;
      }
    }

    if (!correction) {
      return NextResponse.json({ 
        data: null,
        originalPunches: {
          morning_entry: originalMorningEntry,
          lunch_exit: originalLunchExit,
          afternoon_entry: originalAfternoonEntry,
          final_exit: originalFinalExit,
        }
      });
    }

    return NextResponse.json({ 
      data: correction,
      originalPunches: {
        morning_entry: originalMorningEntry,
        lunch_exit: originalLunchExit,
        afternoon_entry: originalAfternoonEntry,
        final_exit: originalFinalExit,
      }
    });
  } catch (error: any) {
    logger.error('[manual-punch GET] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar correção manual' },
      { status: 500 }
    );
  }
}

/**
 * POST: Criar ou atualizar correção manual de batidas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      date,
      morningEntry,
      lunchExit,
      afternoonEntry,
      finalExit,
      correctedBy,
      correctionReason,
    } = body;

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'employeeId e date são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar formato de data
    const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (!isValid(parsedDate)) {
      return NextResponse.json(
        { error: 'Formato de data inválido. Use yyyy-MM-dd' },
        { status: 400 }
      );
    }

    // Validar que pelo menos uma batida foi fornecida
    if (!morningEntry && !lunchExit && !afternoonEntry && !finalExit) {
      return NextResponse.json(
        { error: 'É necessário fornecer pelo menos uma batida' },
        { status: 400 }
      );
    }

    // Validar formatos de horário (HH:mm ou HH:mm:ss)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    
    const validateTime = (time: string | null | undefined, fieldName: string) => {
      if (time && !timeRegex.test(time)) {
        throw new Error(`${fieldName} deve estar no formato HH:mm ou HH:mm:ss`);
      }
    };

    validateTime(morningEntry, 'morningEntry');
    validateTime(lunchExit, 'lunchExit');
    validateTime(afternoonEntry, 'afternoonEntry');
    validateTime(finalExit, 'finalExit');

    // Converter horários para formato completo datetime (yyyy-MM-dd HH:mm:ss)
    const formatTime = (time: string | null | undefined): string | null => {
      if (!time) return null;
      // Se já estiver no formato completo, retornar como está
      if (time.includes(' ')) return time;
      // Se for apenas HH:mm, adicionar :00 para segundos
      const timeWithSeconds = time.includes(':') && time.split(':').length === 2 
        ? `${time}:00` 
        : time;
      return `${date} ${timeWithSeconds}`;
    };

    const formattedMorningEntry = formatTime(morningEntry);
    const formattedLunchExit = formatTime(lunchExit);
    const formattedAfternoonEntry = formatTime(afternoonEntry);
    const formattedFinalExit = formatTime(finalExit);

    // Verificar se funcionário existe
    const employee = await queryOne<{ id: number }>(
      `SELECT id FROM employees WHERE id = $1`,
      [parseInt(employeeId)]
    );

    if (!employee) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado' },
        { status: 404 }
      );
    }

    // Inserir ou atualizar correção manual
    const useSupabase = !!process.env.SUPABASE_DB_URL;
    
    const result = await query(
      `
        INSERT INTO manual_punch_corrections
          (employee_id, date, morning_entry, lunch_exit, afternoon_entry, final_exit, 
           corrected_by, correction_reason, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${useSupabase ? 'NOW()' : 'CURRENT_TIMESTAMP'})
        ON CONFLICT (employee_id, date) DO UPDATE SET
          morning_entry = EXCLUDED.morning_entry,
          lunch_exit = EXCLUDED.lunch_exit,
          afternoon_entry = EXCLUDED.afternoon_entry,
          final_exit = EXCLUDED.final_exit,
          corrected_by = EXCLUDED.corrected_by,
          correction_reason = EXCLUDED.correction_reason,
          updated_at = ${useSupabase ? 'NOW()' : 'CURRENT_TIMESTAMP'}
        RETURNING id, employee_id, date, morning_entry, lunch_exit, afternoon_entry, final_exit,
                  corrected_by, correction_reason, created_at, updated_at
      `,
      [
        parseInt(employeeId),
        date,
        formattedMorningEntry,
        formattedLunchExit,
        formattedAfternoonEntry,
        formattedFinalExit,
        correctedBy || null,
        correctionReason || null,
      ]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao salvar correção manual' },
        { status: 500 }
      );
    }

    // Recalcular o registro para aplicar a correção manual
    try {
      await calculateDailyRecords(date);
      logger.info(`[manual-punch] Registro recalculado para data ${date} após correção manual`);
    } catch (error: any) {
      logger.error(`[manual-punch] Erro ao recalcular após correção manual:`, error);
      // Continuar mesmo se o recálculo falhar
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    logger.error('[manual-punch POST] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar correção manual' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remover correção manual de batidas
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'employeeId e date são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `DELETE FROM manual_punch_corrections WHERE employee_id = $1 AND date = $2 RETURNING id`,
      [parseInt(employeeId), date]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Correção manual não encontrada' },
        { status: 404 }
      );
    }

    // Recalcular o registro após remover correção manual
    try {
      await calculateDailyRecords(date);
      logger.info(`[manual-punch] Registro recalculado para data ${date} após remover correção manual`);
    } catch (error: any) {
      logger.error(`[manual-punch] Erro ao recalcular após remover correção manual:`, error);
      // Continuar mesmo se o recálculo falhar
    }

    return NextResponse.json({
      success: true,
      message: 'Correção manual removida com sucesso',
    });
  } catch (error: any) {
    logger.error('[manual-punch DELETE] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao remover correção manual' },
      { status: 500 }
    );
  }
}

