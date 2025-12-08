import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/infrastructure/database';
import { calculateDailyRecords } from '@/application/daily-calculation-service';
import { logger } from '@/infrastructure/logger';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para recalcular todos os registros processados
 * Útil após mudanças nas regras de cálculo (ex: migração para CLT)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { date } = body;

    if (date) {
      // Recalcular apenas uma data específica
      logger.info(`[recalculate] Recalculando registros da data: ${date}`);
      await calculateDailyRecords(date);
      
      return NextResponse.json({
        success: true,
        message: `Registros da data ${date} recalculados com sucesso`,
        date,
      });
    } else {
      // Recalcular todas as datas que têm registros de ponto
      logger.info('[recalculate] Recalculando TODOS os registros...');
      
      // Buscar todas as datas únicas que têm registros de ponto
      const isProduction = process.env.NODE_ENV === 'production';
      const useSupabase = isProduction && process.env.SUPABASE_DB_URL;
      
      let sql: string;
      if (useSupabase) {
        sql = `SELECT DISTINCT DATE(datetime) as date FROM time_records ORDER BY date DESC`;
      } else {
        sql = `SELECT DISTINCT date(datetime) as date FROM time_records ORDER BY date DESC`;
      }
      
      const processedDates = await query<{ date: string }>(sql);

      if (processedDates.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'Nenhum registro processado encontrado para recalcular',
          recalculated: 0,
        });
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const { date: recordDate } of processedDates) {
        try {
          await calculateDailyRecords(recordDate);
          successCount++;
        } catch (error: any) {
          errorCount++;
          const errorMsg = `Erro ao recalcular ${recordDate}: ${error.message}`;
          errors.push(errorMsg);
          logger.error(`[recalculate] ${errorMsg}`);
        }
      }

      return NextResponse.json({
        success: errorCount === 0,
        message: `Recálculo concluído: ${successCount} datas recalculadas${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
        recalculated: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      });
    }
  } catch (error: any) {
    logger.error('[recalculate] Erro:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erro ao recalcular registros' 
      },
      { status: 500 }
    );
  }
}
