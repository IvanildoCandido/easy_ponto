import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/infrastructure/database';
import { calculateDailyRecords } from '@/application/daily-calculation-service';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      occurrence_type, 
      occurrence_hours_minutes, 
      occurrence_duration 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do registro é obrigatório' },
        { status: 400 }
      );
    }

    // Validar occurrence_type se fornecido
    const validTypes = ['FERIADO', 'FALTA', 'FOLGA', 'ATESTADO', 'DECLARACAO'];
    if (occurrence_type && !validTypes.includes(occurrence_type)) {
      return NextResponse.json(
        { error: `Tipo de ocorrência inválido. Valores permitidos: ${validTypes.join(', ')} ou null` },
        { status: 400 }
      );
    }

    // Validar occurrence_duration se fornecido
    const validDurations = ['COMPLETA', 'MEIO_PERIODO'];
    if (occurrence_duration && !validDurations.includes(occurrence_duration)) {
      return NextResponse.json(
        { error: `Duração de ocorrência inválida. Valores permitidos: ${validDurations.join(', ')} ou null` },
        { status: 400 }
      );
    }

    // Validar occurrence_hours_minutes (deve ser número positivo se fornecido)
    if (occurrence_hours_minutes !== undefined && occurrence_hours_minutes !== null) {
      const hours = parseInt(String(occurrence_hours_minutes), 10);
      if (isNaN(hours) || hours < 0) {
        return NextResponse.json(
          { error: 'occurrence_hours_minutes deve ser um número positivo ou null' },
          { status: 400 }
        );
      }
    }

    // Se occurrence_type for null, limpar também os campos relacionados
    const finalOccurrenceType = occurrence_type || null;
    const finalHours = finalOccurrenceType ? (occurrence_hours_minutes !== undefined ? occurrence_hours_minutes : null) : null;
    const finalDuration = finalOccurrenceType ? (occurrence_duration || null) : null;

    // Buscar o registro para obter employee_id e date
    const existingRecord = await query(
      `SELECT employee_id, date 
       FROM processed_records 
       WHERE id = $1`,
      [id]
    );

    if (existingRecord.length === 0) {
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    const record = existingRecord[0];
    const recordDate = record.date instanceof Date 
      ? record.date.toISOString().split('T')[0] 
      : record.date.split('T')[0];

    // Atualizar apenas os campos de ocorrência
    const result = await query(
      `
        UPDATE processed_records
        SET 
          occurrence_type = $1,
          occurrence_hours_minutes = $2,
          occurrence_duration = $3
        WHERE id = $4
        RETURNING id, occurrence_type, occurrence_hours_minutes, occurrence_duration
      `,
      [finalOccurrenceType, finalHours, finalDuration, id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao atualizar registro' },
        { status: 500 }
      );
    }

    // Recalcular o registro para ajustar expected_minutes e balance_seconds baseado na ocorrência
    // O calculateDailyRecords preserva a ocorrência e recalcula os valores corretamente
    try {
      await calculateDailyRecords(recordDate);
      
      // Buscar o registro atualizado após recálculo
      const updatedRecord = await query(
        `SELECT id, occurrence_type, occurrence_hours_minutes, occurrence_duration, expected_minutes, balance_seconds, worked_minutes
         FROM processed_records 
         WHERE id = $1`,
        [id]
      );
      
      if (updatedRecord.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            id: updatedRecord[0].id,
            occurrence_type: updatedRecord[0].occurrence_type,
            occurrence_hours_minutes: updatedRecord[0].occurrence_hours_minutes,
            occurrence_duration: updatedRecord[0].occurrence_duration,
            expected_minutes: updatedRecord[0].expected_minutes,
            balance_seconds: updatedRecord[0].balance_seconds,
            worked_minutes: updatedRecord[0].worked_minutes,
          },
        });
      }
    } catch (error: any) {
      console.warn('Erro ao recalcular após atualizar ocorrência:', error.message);
      // Retornar o resultado da atualização mesmo se o recálculo falhar
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error: any) {
    console.error('Erro ao atualizar ocorrência:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar ocorrência' },
      { status: 500 }
    );
  }
}

