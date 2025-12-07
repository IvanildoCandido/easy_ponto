/**
 * Script para recalcular o registro da Marizelma no dia 05/12/2025
 * e verificar se o cálculo está correto
 */

import { calculateDailyRecords } from '../lib/calculate';

async function main() {
  const date = '2025-12-05';
  console.log(`Recalculando registros para ${date}...`);
  
  try {
    await calculateDailyRecords(date);
    console.log('✅ Recalculação concluída!');
    console.log('\nVerifique no banco de dados se worked_minutes = 626 para Marizelma');
  } catch (error) {
    console.error('❌ Erro ao recalcular:', error);
    process.exit(1);
  }
}

main();
