import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/infrastructure/database';

export async function GET() {
  try {
    const employees = await query('SELECT * FROM employees ORDER BY name');
    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}



