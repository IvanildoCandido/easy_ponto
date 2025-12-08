import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/infrastructure/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employees = await query('SELECT * FROM employees ORDER BY name');
    return NextResponse.json(employees || []);
  } catch (error: any) {
    console.error('[api/employees] Erro ao buscar funcionários:', error);
    // Retornar array vazio em caso de erro para evitar crash no frontend
    return NextResponse.json([], { status: 500 });
  }
}



