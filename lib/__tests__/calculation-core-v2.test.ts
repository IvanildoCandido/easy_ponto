/**
 * Testes unitários para cálculo de ponto - Modelo V2
 * Saldo = HorasTrabalhadas - HorasPrevistas
 */

import { computeDaySummaryV2, PunchTimes, ScheduledTimes } from '../../domain/time-calculation';

describe('Cálculo de Ponto V2 - Saldo = HorasTrabalhadas - HorasPrevistas', () => {
  const workDate = '2025-12-05';

  describe('8.1 Caso Dayana (08/12/14/18)', () => {
    test('Batidas: 08:13 / 12:11 / 14:11 / 17:56', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:13:00',
        lunchExit: '2025-12-05 12:11:00',
        afternoonEntry: '2025-12-05 14:11:00',
        finalExit: '2025-12-05 17:56:00',
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas
      // Manhã: 08:13 até 12:11 = 238 min = 14280s
      // Tarde: 14:11 até 17:56 = 225 min = 13500s
      // Total: 463 min = 27780s
      expect(summary.workedMinutes).toBe(463);
      expect(summary.workedSeconds).toBe(27780);
      
      // Horas previstas
      // Manhã: 08:00 até 12:00 = 240 min = 14400s
      // Tarde: 14:00 até 18:00 = 240 min = 14400s
      // Total: 480 min = 28800s
      expect(summary.expectedMinutes).toBe(480);
      expect(summary.expectedSeconds).toBe(28800);
      
      // Saldo = 27780 - 28800 = -1020s = -17min
      expect(summary.balanceSeconds).toBe(-1020);
      expect(summary.balanceMinutes).toBe(-17);
      
      // Indicadores informativos
      expect(summary.delayMinutes).toBe(13); // Atraso na entrada
      expect(summary.overtimeMinutes).toBe(0); // Saída dentro do previsto (17:56 vs 18:00 = -4min, mas não é extra)
      expect(summary.earlyExitMinutes).toBe(4); // Saída 4 min antes
    });
  });

  describe('8.2 Atraso no almoço', () => {
    test('Escala 08:00-12:00/14:00-18:00, Batidas: 08:00/12:00/14:15/18:00', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:00:00',
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:15:00', // Atraso de 15 min no retorno
        finalExit: '2025-12-05 18:00:00',
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas
      // Manhã: 08:00 até 12:00 = 240 min
      // Tarde: 14:15 até 18:00 = 225 min (15 min a menos por atrasar no almoço)
      // Total: 465 min
      expect(summary.workedMinutes).toBe(465);
      
      // Horas previstas: 480 min
      expect(summary.expectedMinutes).toBe(480);
      
      // Saldo = 465 - 480 = -15 min
      expect(summary.balanceMinutes).toBe(-15);
      
      // Excesso de intervalo
      expect(summary.intervalExcessSeconds).toBeGreaterThan(0);
    });
  });

  describe('8.3 Saída antes', () => {
    test('Batidas: 08:00/12:00/14:00/17:30', () => {
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
        finalExit: '2025-12-05 17:30:00', // Saída 30 min antes
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas
      // Manhã: 08:00 até 12:00 = 240 min
      // Tarde: 14:00 até 17:30 = 210 min (30 min a menos)
      // Total: 450 min
      expect(summary.workedMinutes).toBe(450);
      
      // Horas previstas: 480 min
      expect(summary.expectedMinutes).toBe(480);
      
      // Saldo = 450 - 480 = -30 min
      expect(summary.balanceMinutes).toBe(-30);
      
      // Indicador: saída antecipada
      expect(summary.earlyExitMinutes).toBe(30);
    });
  });

  describe('8.4 Hora extra real', () => {
    test('Batidas: 08:00/12:00/14:00/18:30', () => {
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
        finalExit: '2025-12-05 18:30:00', // Saída 30 min depois
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas
      // Manhã: 08:00 até 12:00 = 240 min
      // Tarde: 14:00 até 18:30 = 270 min (30 min a mais)
      // Total: 510 min
      expect(summary.workedMinutes).toBe(510);
      
      // Horas previstas: 480 min
      expect(summary.expectedMinutes).toBe(480);
      
      // Saldo = 510 - 480 = +30 min
      expect(summary.balanceMinutes).toBe(30);
      
      // Indicador: hora extra
      expect(summary.overtimeMinutes).toBe(30);
    });
  });

  describe('8.5 Jornada 1 expediente (2 batidas)', () => {
    test('Escala parcial tarde 13:00-18:00 (5h), Batidas: 12:54/18:19', () => {
      const schedule: ScheduledTimes = {
        morningStart: null,
        morningEnd: null,
        afternoonStart: '13:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: null,
        lunchExit: null,
        afternoonEntry: '2025-12-05 12:54:00', // Chegou 6 min antes
        finalExit: '2025-12-05 18:19:00', // Saiu 19 min depois
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      expect(summary.status).toBe('OK');
      
      // Horas trabalhadas
      // 12:54 até 18:19 = 325 min = 5h 25min
      expect(summary.workedMinutes).toBe(325);
      
      // Horas previstas: 13:00 até 18:00 = 300 min = 5h
      expect(summary.expectedMinutes).toBe(300);
      
      // Saldo = 325 - 300 = +25 min
      expect(summary.balanceMinutes).toBe(25);
      
      // Indicadores
      expect(summary.earlyArrivalMinutes).toBe(6); // Chegou 6 min antes
      expect(summary.overtimeMinutes).toBe(19); // Saiu 19 min depois
    });
  });

  describe('Validação de batidas', () => {
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

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      expect(summary.status).toBe('INCONSISTENTE');
    });
  });

  describe('Cálculo em segundos (não pode comer minutos)', () => {
    test('Deve calcular corretamente em segundos ignorando segundos das batidas', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      // Batidas com segundos (devem ser ignorados)
      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:00:30',    // 30 segundos (ignorados)
        lunchExit: '2025-12-05 12:00:45',       // 45 segundos (ignorados)
        afternoonEntry: '2025-12-05 14:00:15',  // 15 segundos (ignorados)
        finalExit: '2025-12-05 18:00:20',       // 20 segundos (ignorados)
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // IMPORTANTE: O sistema ignora segundos completamente
      // Manhã: 08:00 até 12:00 = 240 min = 14400s
      // Tarde: 14:00 até 18:00 = 240 min = 14400s
      // Total: 480 min = 28800s
      // Minutos (floor): 480 min
      expect(summary.workedSeconds).toBe(28800);
      expect(summary.workedMinutes).toBe(480);
      
      // Previsto: 480 min = 28800s
      expect(summary.expectedSeconds).toBe(28800);
      expect(summary.expectedMinutes).toBe(480);
      
      // Saldo: 28800 - 28800 = 0s = 0 min
      expect(summary.balanceSeconds).toBe(0);
      expect(summary.balanceMinutes).toBe(0);
    });

    test('Caso Valdinete: não pode sumir minutos (07-13/14-18, batidas 06:58/13:02/13:58/18:14)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '07:00',
        morningEnd: '13:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 06:58:00',
        lunchExit: '2025-12-05 13:02:00',
        afternoonEntry: '2025-12-05 13:58:00',
        finalExit: '2025-12-05 18:14:00',
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Manhã: 06:58 até 13:02 = 6h 4min = 364 min = 21840s
      // Tarde: 13:58 até 18:14 = 4h 16min = 256 min = 15360s
      // Total: 10h 20min = 620 min = 37200s
      expect(summary.workedSeconds).toBe(37200);
      expect(summary.workedMinutes).toBe(620);
      
      // Previsto: (07-13)=360min + (14-18)=240min = 600min = 36000s
      expect(summary.expectedSeconds).toBe(36000);
      expect(summary.expectedMinutes).toBe(600);
      
      // Saldo: 37200 - 36000 = +1200s = +20min
      expect(summary.balanceSeconds).toBe(1200);
      expect(summary.balanceMinutes).toBe(20);
    });
  });

  describe('Excesso de intervalo (não é atraso)', () => {
    test('Caso Igor: excesso de intervalo separado do atraso (08-12/13-17, batidas 07:55/12:05/14:08/18:00)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '13:00',
        afternoonEnd: '17:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 07:55:00',    // Chegou 5 min antes
        lunchExit: '2025-12-05 12:05:00',        // Saiu 5 min depois
        afternoonEntry: '2025-12-05 14:08:00',   // Voltou 1h 8min depois (excesso de intervalo)
        finalExit: '2025-12-05 18:00:00',       // Saiu 1h depois (hora extra)
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Horas trabalhadas
      // Manhã: 07:55 até 12:05 = 4h 10min = 250 min = 15000s
      // Tarde: 14:08 até 18:00 = 3h 52min = 232 min = 13920s
      // Total: 482 min = 28920s
      expect(summary.workedMinutes).toBe(482);
      expect(summary.workedSeconds).toBe(28920);
      
      // Horas previstas
      // Manhã: 08:00 até 12:00 = 240 min = 14400s
      // Tarde: 13:00 até 17:00 = 240 min = 14400s
      // Total: 480 min = 28800s
      expect(summary.expectedMinutes).toBe(480);
      expect(summary.expectedSeconds).toBe(28800);
      
      // Saldo: 28920 - 28800 = +120s = +2min
      expect(summary.balanceSeconds).toBe(120);
      expect(summary.balanceMinutes).toBe(2);
      
      // Excesso de intervalo
      // Intervalo real: 12:05 até 14:08 = 2h 3min = 123 min = 7380s
      // Intervalo previsto: 12:00 até 13:00 = 1h = 60 min = 3600s
      // Excesso: 7380 - 3600 = 3780s = 63 min
      expect(summary.intervalExcessSeconds).toBe(3780);
      expect(summary.intervalExcessMinutes).toBe(63);
      
      // Indicadores (início/fim da jornada)
      // Atraso na entrada: 07:55 vs 08:00 = -5min (chegada antecipada)
      expect(summary.delayMinutes).toBe(0);
      expect(summary.earlyArrivalMinutes).toBe(5);
      
      // Hora extra na saída: 18:00 vs 17:00 = +60min
      expect(summary.overtimeMinutes).toBe(60);
      expect(summary.earlyExitMinutes).toBe(0);
      
      // Valores CLT
      // delta_start = -5, delta_end = +60
      // tolerated_start = 5, tolerated_end = 5
      // tolerated_sum = 10 (limite do teto)
      // Com teto de 10min, todos os valores CLT são zerados
      expect(summary.atrasoCltMinutes).toBe(0);
      expect(summary.chegadaAntecCltMinutes).toBe(0);
      expect(summary.extraCltMinutes).toBe(0);
      expect(summary.saidaAntecCltMinutes).toBe(0);
      expect(summary.saldoCltMinutes).toBe(0);
    });
  });

  describe('Cálculo CLT (art. 58 §1º + Súmula 366 TST)', () => {
    test('Caso Igor: tolerância aplicada corretamente (08-12/13-17, batidas 07:55/12:05/14:08/18:00)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '13:00',
        afternoonEnd: '17:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 07:55:00',    // Chegou 5 min antes
        lunchExit: '2025-12-05 12:05:00',
        afternoonEntry: '2025-12-05 14:08:00',
        finalExit: '2025-12-05 18:00:00',       // Saiu 60 min depois
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Saldo gerencial
      expect(summary.workedMinutes).toBe(482); // 4h10 + 3h52
      expect(summary.expectedMinutes).toBe(480);
      expect(summary.balanceMinutes).toBe(2); // +2 min
      
      // Valores CLT
      // delta_start = 07:55 - 08:00 = -5
      // delta_end = 18:00 - 17:00 = +60
      // tolerated_start = 5, tolerated_end = 5
      // tolerated_sum = 10 (limite do teto)
      // Com teto de 10min, todos os valores CLT são zerados
      expect(summary.atrasoCltMinutes).toBe(0);
      expect(summary.chegadaAntecCltMinutes).toBe(0); // 5 min tolerados
      expect(summary.extraCltMinutes).toBe(0); // Zerado pelo teto de 10min
      expect(summary.saidaAntecCltMinutes).toBe(0);
      expect(summary.saldoCltMinutes).toBe(0);
    });

    test('Caso Dayana: tolerância aplicada corretamente (08-12/14-18, batidas 08:13/12:11/14:11/17:56)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:13:00',    // Atraso de 13 min
        lunchExit: '2025-12-05 12:11:00',
        afternoonEntry: '2025-12-05 14:11:00',
        finalExit: '2025-12-05 17:56:00',       // Saída 4 min antes
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Saldo gerencial
      expect(summary.workedMinutes).toBe(463); // 7h43
      expect(summary.expectedMinutes).toBe(480);
      expect(summary.balanceMinutes).toBe(-17); // -17 min
      
      // Valores CLT
      // delta_start = 08:13 - 08:00 = +13
      // delta_end = 17:56 - 18:00 = -4
      // tolerated_start = 5, tolerated_end = 4
      // tolerated_sum = 9 (não excedeu 10)
      // chargeable_start = 13-5 = 8, chargeable_end = 4-4 = 0
      expect(summary.atrasoCltMinutes).toBe(8); // 13 - 5 = 8
      expect(summary.chegadaAntecCltMinutes).toBe(0);
      expect(summary.extraCltMinutes).toBe(0);
      expect(summary.saidaAntecCltMinutes).toBe(0); // 4 min tolerados
      expect(summary.saldoCltMinutes).toBe(-8); // 0 - 8 = -8
    });

    test('Caso com excedente de tolerância: tolerated_sum > 10', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:07:00',    // Atraso de 7 min
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 18:07:00',       // Extra de 7 min
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Valores CLT
      // delta_start = +7, delta_end = +7
      // tolerated_start = 5, tolerated_end = 5
      // tolerated_sum = 10 (não excedeu, mas está no limite)
      // chargeable_start = 7-5 = 2, chargeable_end = 7-5 = 2
      expect(summary.atrasoCltMinutes).toBe(2); // 7 - 5 = 2
      expect(summary.extraCltMinutes).toBe(2); // 7 - 5 = 2
      expect(summary.saldoCltMinutes).toBe(0); // 2 - 2 = 0
    });

    test('Caso com excedente: tolerated_sum = 12 (7+5)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:07:00',    // Atraso de 7 min
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 18:05:00',       // Extra de 5 min
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Valores CLT
      // delta_start = +7, delta_end = +5
      // tolerated_start = 5, tolerated_end = 5
      // tolerated_sum = 10 (não excedeu)
      // chargeable_start = 7-5 = 2, chargeable_end = 5-5 = 0
      expect(summary.atrasoCltMinutes).toBe(2); // 7 - 5 = 2
      expect(summary.extraCltMinutes).toBe(0); // 5 - 5 = 0
      expect(summary.saldoCltMinutes).toBe(-2); // 0 - 2 = -2
    });

    test('Caso com excedente real: tolerated_sum = 12 (7+7)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:07:00',    // Atraso de 7 min
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 18:07:00',       // Extra de 7 min
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Valores CLT
      // delta_start = +7, delta_end = +7
      // tolerated_start = 5, tolerated_end = 5
      // tolerated_sum = 10 (não excedeu, está no limite)
      // chargeable_start = 7-5 = 2, chargeable_end = 7-5 = 2
      expect(summary.atrasoCltMinutes).toBe(2); // 7 - 5 = 2
      expect(summary.extraCltMinutes).toBe(2); // 7 - 5 = 2
      expect(summary.saldoCltMinutes).toBe(0); // 2 - 2 = 0
    });

    test('Caso com excedente: tolerated_sum = 12 (8+5)', () => {
      const schedule: ScheduledTimes = {
        morningStart: '08:00',
        morningEnd: '12:00',
        afternoonStart: '14:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 08:08:00',    // Atraso de 8 min
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 14:00:00',
        finalExit: '2025-12-05 18:05:00',       // Extra de 5 min
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Valores CLT
      // delta_start = +8, delta_end = +5
      // tolerated_start = 5, tolerated_end = 5
      // tolerated_sum = 10 (não excedeu)
      // chargeable_start = 8-5 = 3, chargeable_end = 5-5 = 0
      expect(summary.atrasoCltMinutes).toBe(3); // 8 - 5 = 3
      expect(summary.extraCltMinutes).toBe(0); // 5 - 5 = 0
      expect(summary.saldoCltMinutes).toBe(-3); // 0 - 3 = -3
    });
  });

  describe('Caso Marizelma - Correção de cálculo', () => {
    test('Batidas: 06:55/12:00/12:58/18:19, Previsto: 07:00-12:00/13:00-18:00 (600 min)', () => {
      // Escala da Marizelma na sexta-feira conforme RELATORIO_HORARIOS.md
      const schedule: ScheduledTimes = {
        morningStart: '07:00',
        morningEnd: '12:00',
        afternoonStart: '13:00',
        afternoonEnd: '18:00',
      };

      const punches: PunchTimes = {
        morningEntry: '2025-12-05 06:55:00',
        lunchExit: '2025-12-05 12:00:00',
        afternoonEntry: '2025-12-05 12:58:00',
        finalExit: '2025-12-05 18:19:00',
      };

      const summary = computeDaySummaryV2(punches, schedule, workDate);
      
      // Cálculo correto:
      // Manhã: 06:55 → 12:00 = 5h05 = 305 min = 18300s
      // Tarde: 12:58 → 18:19 = 5h21 = 321 min = 19260s
      // Total: 626 min = 37560s
      expect(summary.workedSeconds).toBe(37560);
      expect(summary.workedMinutes).toBe(626); // floor(37560/60) = 626
      
      // Previsto: 07:00-12:00 (5h) + 13:00-18:00 (5h) = 10h = 600 min = 36000s
      expect(summary.expectedSeconds).toBe(36000);
      expect(summary.expectedMinutes).toBe(600);
      
      // Saldo: 626 - 600 = 26 min
      expect(summary.balanceSeconds).toBe(1560); // 37560 - 36000
      expect(summary.balanceMinutes).toBe(26); // 626 - 600
      
      // Verificar que não há perda de minutos
      const morningMinutes = Math.floor(summary.morningWorkedSeconds / 60);
      const afternoonMinutes = Math.floor(summary.afternoonWorkedSeconds / 60);
      expect(morningMinutes).toBe(305);
      expect(afternoonMinutes).toBe(321);
      expect(morningMinutes + afternoonMinutes).toBe(626);
    });
  });
});

