/**
 * Script para resetar e recalcular todos os registros
 * Execute: npx tsx scripts/reset-and-recalculate.ts
 */

import { query } from '../infrastructure/database';
import { calculateDailyRecords } from '../application/daily-calculation-service';
import { logger } from '../infrastructure/logger';

async function resetAndRecalculate() {
  logger.info('Iniciando reset e recálculo de todos os registros...');

  try {
    // 1. Buscar todas as datas únicas que têm registros de ponto
    const isProduction = process.env.NODE_ENV === 'production';
    const useSupabase = isProduction && process.env.SUPABASE_DB_URL;
    
    const sql = useSupabase
      ? `SELECT DISTINCT DATE(datetime) as date FROM time_records ORDER BY date`
      : `SELECT DISTINCT date(datetime) as date FROM time_records ORDER BY date`;
    
    const dates = await query<{ date: string }>(sql);

    if (dates.length === 0) {
      logger.info('Nenhum registro de ponto encontrado.');
      return;
    }

    logger.info(`Encontradas ${dates.length} datas com registros`);

    // 2. Recalcular todas as datas
    logger.info('Recalculando registros...');
    let successCount = 0;
    let errorCount = 0;

    for (const { date } of dates) {
      try {
        await calculateDailyRecords(date);
        successCount++;
      } catch (error: any) {
        errorCount++;
        logger.error(`Erro ao processar ${date}: ${error.message}`);
      }
    }

    // 3. Resumo
    logger.info(`Recálculo concluído: ${successCount} sucesso, ${errorCount} erros, total: ${dates.length}`);
  } catch (error: any) {
    logger.error('Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  resetAndRecalculate()
    .then(() => {
      logger.info('Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erro ao executar script:', error);
      process.exit(1);
    });
}

export { resetAndRecalculate };


