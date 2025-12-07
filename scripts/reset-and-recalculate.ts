/**
 * Script para resetar e recalcular todos os registros com a nova regra CLT
 * Execute: npx tsx scripts/reset-and-recalculate.ts
 */

import { query } from '../lib/db';
import { calculateDailyRecords } from '../lib/calculate';

async function resetAndRecalculate() {
  console.log('🔄 Iniciando reset e recálculo de todos os registros...\n');

  try {
    // 1. Buscar todas as datas únicas que têm registros de ponto
    console.log('📅 Buscando datas com registros de ponto...');
    const dates = await query<{ date: string }>(
      `SELECT DISTINCT DATE(datetime) as date FROM time_records ORDER BY date`
    );

    if (dates.length === 0) {
      console.log('ℹ️  Nenhum registro de ponto encontrado.');
      return;
    }

    console.log(`✓ Encontradas ${dates.length} datas com registros\n`);

    // 2. Limpar registros processados antigos (opcional - comentado para segurança)
    // console.log('🗑️  Limpando registros processados antigos...');
    // await query('DELETE FROM processed_records');
    // console.log('✓ Registros processados limpos\n');

    // 3. Recalcular todas as datas
    console.log('🔄 Recalculando registros com nova regra CLT...\n');
    let successCount = 0;
    let errorCount = 0;

    for (const { date } of dates) {
      try {
        console.log(`  Processando ${date}...`);
        await calculateDailyRecords(date);
        successCount++;
        console.log(`  ✓ ${date} recalculado\n`);
      } catch (error: any) {
        errorCount++;
        console.error(`  ✗ Erro ao processar ${date}: ${error.message}\n`);
      }
    }

    // 4. Resumo
    console.log('\n' + '='.repeat(50));
    console.log('✅ RECÁLCULO CONCLUÍDO');
    console.log('='.repeat(50));
    console.log(`✓ Datas processadas com sucesso: ${successCount}`);
    if (errorCount > 0) {
      console.log(`✗ Datas com erro: ${errorCount}`);
    }
    console.log(`📊 Total de datas: ${dates.length}`);
    console.log('='.repeat(50));
  } catch (error: any) {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  resetAndRecalculate()
    .then(() => {
      console.log('\n✅ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

export { resetAndRecalculate };


