// Teste direto da função de cálculo
const { parse } = require('date-fns');

function calculateSecondsDifference(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

function toMinutesFloor(seconds) {
  return Math.floor(seconds / 60);
}

// Caso da Marizelma
const morningEntry = parse('2025-12-05 06:55:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const lunchExit = parse('2025-12-05 12:00:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const afternoonEntry = parse('2025-12-05 12:58:00', 'yyyy-MM-dd HH:mm:ss', new Date());
const finalExit = parse('2025-12-05 18:19:00', 'yyyy-MM-dd HH:mm:ss', new Date());

console.log('=== TESTE CÁLCULO MARIZELMA ===');
console.log('Entry1:', morningEntry.toISOString());
console.log('Exit1:', lunchExit.toISOString());
console.log('Entry2:', afternoonEntry.toISOString());
console.log('Exit2:', finalExit.toISOString());
console.log('');

const morningDiff = calculateSecondsDifference(morningEntry, lunchExit);
const afternoonDiff = calculateSecondsDifference(afternoonEntry, finalExit);
const totalSeconds = morningDiff + afternoonDiff;
const totalMinutes = toMinutesFloor(totalSeconds);

console.log('Manhã:', morningDiff, 'segundos =', toMinutesFloor(morningDiff), 'minutos');
console.log('Tarde:', afternoonDiff, 'segundos =', toMinutesFloor(afternoonDiff), 'minutos');
console.log('Total:', totalSeconds, 'segundos =', totalMinutes, 'minutos');
console.log('');

// Verificar se há problema com timezone
console.log('=== VERIFICAÇÃO TIMEZONE ===');
console.log('Entry1 getTime():', morningEntry.getTime());
console.log('Exit1 getTime():', lunchExit.getTime());
console.log('Diferença:', lunchExit.getTime() - morningEntry.getTime());
console.log('Diferença em segundos:', Math.floor((lunchExit.getTime() - morningEntry.getTime()) / 1000));
