/**
 * Testes unitários para cálculo de ponto conforme CLT Art. 58 §1º e Súmula 366 TST
 * 
 * REGRA: Tolerância CLT aplicada APENAS em eventos de JORNADA (início/fim do dia)
 * Saída almoço e entrada tarde NÃO geram atraso/extra de jornada
 */

import { computeDaySummaryCLT, PunchTimes, ScheduledTimes } from '../calculation-core-clt';

describe('Cálculo de Ponto CLT', () => {
  const workDate = '2025-12-05';

  describe('8.1 Tolerância por evento e teto diário (eventos de jornada)', () => {
    test('Caso A: deltas +4, -4 → tolerated_sum=8 → computável=0', () => {
      // Escala: 08:00 / 18:00 (jornada integral)
      // Batidas: 08:04 / 12:00 / 14:00 / 17:56
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:04:00',    // +4 min (jornada início)
        lunchExit: '2025-12-05 12:00:00',       // 0 min (intervalo, não jornada)
        afternoonEntry: '2025-12-05 14:00:00',  // 0 min (intervalo, não jornada)
        finalExit: '2025-12-05 17:56:00',       // -4 min (jornada fim)
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);

      expect(summary.status).toBe('OK');
      expect(summary.toleratedSum).toBe(8); // 4 + 4 = 8 (apenas eventos de jornada)
      expect(summary.toleratedSumAfterCap).toBe(8);
      expect(summary.delayMinutes).toBe(0);
      expect(summary.overtimeMinutes).toBe(0);
      expect(summary.earlyArrivalMinutes).toBe(0);
      expect(summary.earlyExitMinutes).toBe(0);
      expect(summary.balanceMinutes).toBe(0);
    });

    test('Caso B: deltas +4, +4, +4 → tolerated_sum=12 → excedeu 2', () => {
      // Escala: 08:00 / 18:00
      // Batidas: 08:04 / 12:04 / 14:04 / 18:04
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:04:00',    // +4 min (jornada início, tolerado)
        lunchExit: '2025-12-05 12:04:00',       // +4 min (intervalo, NÃO entra no teto)
        afternoonEntry: '2025-12-05 14:04:00',  // +4 min (intervalo, NÃO entra no teto)
        finalExit: '2025-12-05 18:04:00',       // +4 min (jornada fim, tolerado)
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);

      expect(summary.status).toBe('OK');
      // Apenas eventos de jornada: 4 + 4 = 8 (dentro do teto)
      expect(summary.toleratedSum).toBe(8);
      expect(summary.toleratedSumAfterCap).toBe(8);
      expect(summary.delayMinutes).toBe(0);
      expect(summary.overtimeMinutes).toBe(0);
    });

    test('Caso C: delta +6 em uma entrada de jornada → computável 6 (não 1), tolerado 0', () => {
      // Escala: 08:00 / 18:00
      // Batidas: 08:06 / 12:00 / 14:00 / 18:00
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:06:00',    // +6 min (jornada início, fora da tolerância)
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 18:00:00',
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);

      expect(summary.status).toBe('OK');
      
      // Encontrar o evento de entrada manhã (jornada)
      const morningEvent = summary.events.find(e => e.type === 'morningEntry' && e.isJourneyEvent);
      expect(morningEvent).toBeDefined();
      expect(morningEvent?.rawDelta).toBe(6);
      expect(morningEvent?.toleratedMinutes).toBe(0); // Não tolerado
      expect(morningEvent?.chargeableMinutes).toBe(6); // Computa inteiro (não 1)
      expect(morningEvent?.isTolerated).toBe(false);
      
      expect(summary.delayMinutes).toBe(6); // 6 min de atraso
    });
  });

  describe('8.2 Jornada do exemplo (Dayana) - CORRIGIDO', () => {
    test('Escala: 08:00/12:00/14:00/18:00, Batidas: 08:13/12:11/14:11/17:56', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:13:00',    // +13 min (jornada início)
        lunchExit: '2025-12-05 12:11:00',       // +11 min (intervalo, NÃO gera extra/atraso)
        afternoonEntry: '2025-12-05 14:11:00',  // +11 min (intervalo, NÃO gera extra/atraso)
        finalExit: '2025-12-05 17:56:00',       // -4 min (jornada fim, tolerado)
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas (intervalos reais)
      // Manhã: 08:13 até 12:11 = 238 min (3h 58min)
      // Tarde: 14:11 até 17:56 = 225 min (3h 45min)
      // Total: 463 min (7h 43min)
      expect(summary.workedMinutes).toBe(463);
      
      // Eventos de jornada apenas
      const morningEntryEvent = summary.events.find(e => e.type === 'morningEntry' && e.isJourneyEvent);
      expect(morningEntryEvent?.rawDelta).toBe(13);
      expect(morningEntryEvent?.toleratedMinutes).toBe(0); // Fora da tolerância
      expect(morningEntryEvent?.chargeableMinutes).toBe(13); // Computa inteiro
      
      const finalExitEvent = summary.events.find(e => e.type === 'finalExit' && e.isJourneyEvent);
      expect(finalExitEvent?.rawDelta).toBe(-4);
      expect(finalExitEvent?.toleratedMinutes).toBe(4); // Dentro da tolerância
      expect(finalExitEvent?.chargeableMinutes).toBe(0);
      
      // Classificação (APENAS eventos de jornada):
      // Atraso: apenas entrada manhã = 13 min
      expect(summary.delayMinutes).toBe(13);
      
      // Hora extra: saída final tolerada = 0
      expect(summary.overtimeMinutes).toBe(0);
      
      // Saída almoço e entrada tarde NÃO geram atraso/extra
      const lunchExitEvent = summary.events.find(e => e.type === 'lunchExit');
      if (lunchExitEvent) {
        expect(lunchExitEvent.isJourneyEvent).toBe(false); // Não é evento de jornada
      }
      
      const afternoonEntryEvent = summary.events.find(e => e.type === 'afternoonEntry');
      if (afternoonEntryEvent) {
        expect(afternoonEntryEvent.isJourneyEvent).toBe(false); // Não é evento de jornada
      }
      
      // Tolerados: apenas 4 min (saída final)
      expect(summary.toleratedSum).toBe(4);
      expect(summary.toleratedSumAfterCap).toBe(4);
      
      // Saldo: (0 + 0) - (13 + 0) = -13
      expect(summary.balanceMinutes).toBe(-13);
    });
  });

  describe('Jornada parcial (2 batidas)', () => {
    test('Jornada manhã: apenas entrada e saída almoço são eventos de jornada', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '13:00',
        afternoonStart: null,
        afternoonEnd: null,
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:05:00',    // +5 min (jornada início, tolerado)
        lunchExit: '2025-12-05 13:05:00',       // +5 min (jornada fim, tolerado)
        afternoonEntry: null,
        finalExit: null,
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas
      expect(summary.workedMinutes).toBe(300); // 08:05 até 13:05 = 5h
      
      // Eventos de jornada: entrada manhã e saída almoço
      const morningEvent = summary.events.find(e => e.type === 'morningEntry' && e.isJourneyEvent);
      expect(morningEvent).toBeDefined();
      expect(morningEvent?.toleratedMinutes).toBe(5);
      
      const lunchEvent = summary.events.find(e => e.type === 'lunchExit' && e.isJourneyEvent);
      expect(lunchEvent).toBeDefined();
      expect(lunchEvent?.toleratedMinutes).toBe(5);
      
      // Tolerados: 5 + 5 = 10 (dentro do teto)
      expect(summary.toleratedSum).toBe(10);
      expect(summary.delayMinutes).toBe(0);
      expect(summary.overtimeMinutes).toBe(0);
    });

    test('Jornada tarde: apenas entrada tarde e saída final são eventos de jornada', () => {
      const schedule: ScheduledTimes = {
        morningStart: null,
        morningEnd: null,
        afternoonStart: '13:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: null,
        lunchExit: null,
        afternoonEntry: '2025-12-05 13:05:00',  // +5 min (jornada início, tolerado)
        finalExit: '2025-12-05 18:05:00',        // +5 min (jornada fim, tolerado)
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas
      expect(summary.workedMinutes).toBe(300); // 13:05 até 18:05 = 5h
      
      // Eventos de jornada: entrada tarde e saída final
      const afternoonEvent = summary.events.find(e => e.type === 'afternoonEntry' && e.isJourneyEvent);
      expect(afternoonEvent).toBeDefined();
      expect(afternoonEvent?.toleratedMinutes).toBe(5);
      
      const finalEvent = summary.events.find(e => e.type === 'finalExit' && e.isJourneyEvent);
      expect(finalEvent).toBeDefined();
      expect(finalEvent?.toleratedMinutes).toBe(5);
      
      // Tolerados: 5 + 5 = 10 (dentro do teto)
      expect(summary.toleratedSum).toBe(10);
      expect(summary.delayMinutes).toBe(0);
      expect(summary.overtimeMinutes).toBe(0);
    });
  });

  describe('Horas trabalhadas (não pode comer minutos)', () => {
    test('Deve calcular corretamente ignorando segundos', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      // Batidas com segundos que não devem afetar o cálculo
      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:00:30',    // 30 segundos
        lunchExit: '2025-12-05 12:00:45',       // 45 segundos
        afternoonEntry: '2025-12-05 14:00:15',  // 15 segundos
        finalExit: '2025-12-05 18:00:20',       // 20 segundos
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      // Manhã: 08:00 até 12:00 = 240 min (4h)
      // Tarde: 14:00 até 18:00 = 240 min (4h)
      // Total: 480 min (8h)
      expect(summary.workedMinutes).toBe(480);
    });
  });

  describe('Status INCONSISTENTE', () => {
    test('Deve marcar como INCONSISTENTE quando faltam batidas', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:00:00',
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: null, // Faltando
        finalExit: '2025-12-05 18:00:00',
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      expect(summary.status).toBe('INCONSISTENTE');
      expect(summary.logs.some(log => log.includes('INCONSISTENTE'))).toBe(true);
    });
  });

  describe('Saída antecipada', () => {
    test('Deve calcular saída antecipada corretamente (evento de jornada)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:00:00',
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 17:50:00', // -10 min (fora da tolerância, evento de jornada)
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      const finalExitEvent = summary.events.find(e => e.type === 'finalExit' && e.isJourneyEvent);
      expect(finalExitEvent?.rawDelta).toBe(-10);
      expect(finalExitEvent?.toleratedMinutes).toBe(0); // Fora da tolerância
      expect(finalExitEvent?.chargeableMinutes).toBe(10); // Computa inteiro
      
      expect(summary.earlyExitMinutes).toBe(10);
      expect(summary.balanceMinutes).toBeLessThan(0); // Deve afetar saldo negativamente
    });
  });

  describe('Chegada antecipada', () => {
    test('Deve calcular chegada antecipada corretamente (evento de jornada)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 07:50:00', // -10 min (fora da tolerância, evento de jornada)
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 18:00:00',
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      const morningEntryEvent = summary.events.find(e => e.type === 'morningEntry' && e.isJourneyEvent);
      expect(morningEntryEvent?.rawDelta).toBe(-10);
      expect(morningEntryEvent?.toleratedMinutes).toBe(0); // Fora da tolerância
      expect(morningEntryEvent?.chargeableMinutes).toBe(10); // Computa inteiro
      
      expect(summary.earlyArrivalMinutes).toBe(10);
      expect(summary.balanceMinutes).toBeGreaterThan(0); // Deve afetar saldo positivamente
    });
  });

  describe('Saída almoço NÃO gera extra/atraso', () => {
    test('Saída almoço atrasada não deve gerar hora extra', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:00:00',
        lunchExit: '2025-12-05 12:30:00',       // +30 min (intervalo, NÃO gera extra)
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 18:00:00',
      };

      const summary = computeDaySummaryCLT(punches, schedule, workDate);
      
      // Saída almoço não é evento de jornada
      const lunchEvent = summary.events.find(e => e.type === 'lunchExit');
      if (lunchEvent) {
        expect(lunchEvent.isJourneyEvent).toBe(false);
      }
      
      // Hora extra deve ser 0 (apenas eventos de jornada)
      expect(summary.overtimeMinutes).toBe(0);
      expect(summary.delayMinutes).toBe(0);
    });
  });
});
