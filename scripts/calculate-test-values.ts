/**
 * Script para calcular valores corretos dos testes com desconto de excesso de intervalo
 */

// Erivania - 07:56 / 12:30 / 14:00 / 17:30
// Intervalo real: 14:00 - 12:30 = 1h30min = 90min
// Intervalo previsto: 13:00 - 12:00 = 1h = 60min (mas a saída almoço é 12:30, não 12:00)
// Na verdade, intervalo previsto deveria ser calculado como: afternoonStart - morningEnd
// afternoonStart = 13:00, morningEnd = 12:00
// Intervalo previsto = 13:00 - 12:00 = 1h = 60min
// Mas o intervalo real começa em 12:30 (saída almoço real), não 12:00
// Então: intervalo real = 14:00 - 12:30 = 90min
// Intervalo previsto baseado na escala: 13:00 - 12:00 = 60min
// Excesso = 90 - 60 = 30min
// Extra bruto: 17:30 - 17:00 = 30min, excedente = 30 - 5 = 25min
// Após desconto: 25 - 30 = -5min → não pode ser negativo, então zera e vira atraso de 5min? Não, acho que só zera
// Na verdade, pela lógica: se extra < excesso, zera o extra e o restante vira atraso
// Mas neste caso, se há 30min de excesso e 25min de extra, deveria zerar o extra (25min) e o restante (5min) vira atraso
// Mas isso parece estranho... Deixa eu verificar a lógica novamente

console.log('=== CÁLCULO DOS VALORES PARA OS TESTES ===\n');

// Teste 1: Erivania
console.log('1. Erivania - 07:56 / 12:30 / 14:00 / 17:30');
console.log('   Intervalo real: 14:00 - 12:30 = 90min');
console.log('   Intervalo previsto: 13:00 - 12:00 = 60min');
console.log('   Excesso: 90 - 60 = 30min');
console.log('   Extra bruto (após tolerância): 17:30 - 17:00 = 30min, excedente = 30 - 5 = 25min');
console.log('   Após desconto: 25 - 30 = -5min → zera extra, restante (5min) vira atraso');
console.log('   Resultado: EXTRA_CLT = 0, ATRASO_CLT = 5, SALDO = -5\n');

// Teste 2: Igor
console.log('2. Igor - 07:55 / 12:05 / 14:08 / 18:00');
console.log('   Intervalo real: 14:08 - 12:05 = 123min (2h3min)');
console.log('   Intervalo previsto: 13:00 - 12:00 = 60min');
console.log('   Excesso: 123 - 60 = 63min');
console.log('   Extra bruto (após tolerância): 18:00 - 17:00 = 60min, excedente = 60 - 5 = 55min');
console.log('   Após desconto: 55 - 63 = -8min → zera extra, restante (8min) vira atraso');
console.log('   Resultado: EXTRA_CLT = 0, ATRASO_CLT = 8, SALDO = -8\n');

// Teste 3: Jobson
console.log('3. Jobson - 06:58 / 11:58 / 13:00 / 18:16');
console.log('   Intervalo real: 13:00 - 11:58 = 62min');
console.log('   Intervalo previsto: 13:00 - 12:00 = 60min');
console.log('   Excesso: 62 - 60 = 2min');
console.log('   Extra bruto (após tolerância): 18:16 - 18:00 = 16min, excedente = 16 - 5 = 11min');
console.log('   Após desconto: 11 - 2 = 9min');
console.log('   Resultado: EXTRA_CLT = 9, SALDO = 9\n');



