import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/infrastructure/database';
import { logger } from '@/infrastructure/logger';
import type { CalendarEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calendar-events
 * Busca eventos do calendário (feriados e DSR) em um período
 * Query params: startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType'); // FERIADO ou DSR

    const useSupabase = !!process.env.SUPABASE_DB_URL;

    let sql = `
      SELECT 
        id,
        date,
        event_type,
        description,
        applies_to_all_employees,
        created_at,
        updated_at
      FROM calendar_events
      WHERE 1=1
    `;

    const params: any[] = [];

    if (startDate) {
      if (useSupabase) {
        sql += ' AND date >= $' + (params.length + 1) + '::date';
      } else {
        sql += ' AND date(date) >= $' + (params.length + 1);
      }
      params.push(startDate);
    }

    if (endDate) {
      if (useSupabase) {
        sql += ' AND date <= $' + (params.length + 1) + '::date';
      } else {
        sql += ' AND date(date) <= $' + (params.length + 1);
      }
      params.push(endDate);
    }

    if (eventType) {
      sql += ' AND event_type = $' + (params.length + 1);
      params.push(eventType);
    }

    sql += ' ORDER BY date ASC';

    const events = await query<CalendarEvent>(sql, params);

    // Converter applies_to_all_employees para boolean (SQLite retorna 0/1, Postgres retorna boolean)
    const formattedEvents = events.map(event => ({
      ...event,
      applies_to_all_employees: typeof event.applies_to_all_employees === 'boolean' 
        ? event.applies_to_all_employees 
        : event.applies_to_all_employees === 1 || event.applies_to_all_employees === '1'
    }));

    return NextResponse.json(formattedEvents);
  } catch (error: any) {
    logger.error('[Calendar Events API] Erro ao buscar eventos:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar-events
 * Cria um novo evento do calendário (feriado ou DSR)
 */
export async function POST(request: NextRequest) {
  try {
    const body: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> = await request.json();

    if (!body.date || !body.event_type) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: date, event_type' },
        { status: 400 }
      );
    }

    if (!['FERIADO', 'DSR'].includes(body.event_type)) {
      return NextResponse.json(
        { error: 'event_type deve ser FERIADO ou DSR' },
        { status: 400 }
      );
    }

    const useSupabase = !!process.env.SUPABASE_DB_URL;

    // Verificar se já existe evento para essa data e tipo (ignorar se for o mesmo ID em caso de edição)
    const id = (body as any).id; // ID opcional para edição
    let existingCheckSql = `SELECT id FROM calendar_events WHERE date = $1 AND event_type = $2`;
    const existingParams: any[] = [body.date, body.event_type];
    
    if (id) {
      // Se tem ID, está editando - excluir o próprio registro da verificação
      existingCheckSql += ` AND id != $3`;
      existingParams.push(id);
    }
    
    const existing = await queryOne<{ id: number }>(existingCheckSql, existingParams);

    if (existing) {
      return NextResponse.json(
        { error: `Já existe um ${body.event_type} configurado para esta data` },
        { status: 409 }
      );
    }

    // Se tem ID, é atualização (PUT)
    if (id) {
      const updateSql = useSupabase
        ? `
          UPDATE calendar_events 
          SET date = $1::date, event_type = $2, description = $3, applies_to_all_employees = $4, updated_at = now()
          WHERE id = $5
          RETURNING id, date, event_type, description, applies_to_all_employees, created_at, updated_at
        `
        : `
          UPDATE calendar_events 
          SET date = $1, event_type = $2, description = $3, applies_to_all_employees = $4, updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING id, date, event_type, description, applies_to_all_employees, created_at, updated_at
        `;

      const result = await queryOne<CalendarEvent>(
        updateSql,
        [
          body.date,
          body.event_type,
          body.description || null,
          body.applies_to_all_employees !== false ? (useSupabase ? true : 1) : (useSupabase ? false : 0),
          id
        ]
      );

      logger.info(`[Calendar Events API] Evento atualizado: ${body.event_type} em ${body.date} (id=${id})`);
      return NextResponse.json(result);
    }

    // Se não tem ID, é criação (POST)
    const sql = useSupabase
      ? `
        INSERT INTO calendar_events (date, event_type, description, applies_to_all_employees)
        VALUES ($1::date, $2, $3, $4)
        RETURNING id, date, event_type, description, applies_to_all_employees, created_at, updated_at
      `
      : `
        INSERT INTO calendar_events (date, event_type, description, applies_to_all_employees)
        VALUES ($1, $2, $3, $4)
        RETURNING id, date, event_type, description, applies_to_all_employees, created_at, updated_at
      `;

    const result = await queryOne<CalendarEvent>(
      sql,
      [
        body.date,
        body.event_type,
        body.description || null,
        body.applies_to_all_employees !== false ? (useSupabase ? true : 1) : (useSupabase ? false : 0)
      ]
    );

    logger.info(`[Calendar Events API] Evento criado: ${body.event_type} em ${body.date}`);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    logger.error('[Calendar Events API] Erro ao criar evento:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar-events?id=123
 * Remove um evento do calendário
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Parâmetro id é obrigatório' },
        { status: 400 }
      );
    }

    const deleted = await queryOne<{ id: number }>(
      `DELETE FROM calendar_events WHERE id = $1 RETURNING id`,
      [parseInt(id)]
    );

    if (!deleted) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    logger.info(`[Calendar Events API] Evento removido: id=${id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('[Calendar Events API] Erro ao remover evento:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

