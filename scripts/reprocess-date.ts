/**
 * Script para reprocessar uma data específica
 * Execute: npx tsx scripts/reprocess-date.ts 2025-12-09
 */

import { calculateDailyRecords } from '../application/daily-calculation-service';
import { logger } from '../infrastructure/logger';

const date = process.argv[2];

if (!date) {
  console.error('Uso: npx tsx scripts/reprocess-date.ts YYYY-MM-DD');
  console.error('Exemplo: npx tsx scripts/reprocess-date.ts 2025-12-09');
  process.exit(1);
}

async function reprocessDate() {
  try {
    logger.info(`Reprocessando data: ${date}`);
    await calculateDailyRecords(date);
    logger.info(`✅ Data ${date} reprocessada com sucesso!`);
    process.exit(0);
  } catch (error: any) {
    logger.error(`❌ Erro ao reprocessar ${date}:`, error.message);
    process.exit(1);
  }
}

reprocessDate();





