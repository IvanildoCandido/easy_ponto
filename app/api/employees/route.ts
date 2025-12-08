import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/infrastructure/database';
import { logger } from '@/infrastructure/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employees = await query('SELECT * FROM employees ORDER BY name');
    return NextResponse.json(employees || []);
  } catch (error: any) {
    logger.error('[api/employees] Erro ao buscar funcionários:', error);
    return NextResponse.json([], { status: 500 });
  }
}



