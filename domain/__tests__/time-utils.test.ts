/**
 * Testes unitários para utilitários de tempo
 */

import {
  toMinutesFloor,
  calculateSecondsDifference,
  calculateMinutesDifference,
  timeToSeconds,
} from '../time-utils';

describe('time-utils', () => {
  describe('toMinutesFloor', () => {
    test('deve converter segundos para minutos usando floor', () => {
      expect(toMinutesFloor(0)).toBe(0);
      expect(toMinutesFloor(59)).toBe(0);
      expect(toMinutesFloor(60)).toBe(1);
      expect(toMinutesFloor(119)).toBe(1);
      expect(toMinutesFloor(120)).toBe(2);
      expect(toMinutesFloor(3600)).toBe(60);
      expect(toMinutesFloor(3660)).toBe(61);
    });

    test('deve desprezar segundos (floor)', () => {
      expect(toMinutesFloor(179)).toBe(2); // 2 min 59s → 2 min
      expect(toMinutesFloor(3599)).toBe(59); // 59 min 59s → 59 min
    });
  });

  describe('calculateSecondsDifference', () => {
    test('deve calcular diferença em segundos ignorando segundos das batidas', () => {
      const start = new Date('2025-12-05 08:00:00');
      const end = new Date('2025-12-05 12:00:00');
      
      expect(calculateSecondsDifference(start, end)).toBe(14400); // 4h = 240min = 14400s
    });

    test('deve ignorar segundos completamente', () => {
      const start = new Date('2025-12-05 08:00:30');
      const end = new Date('2025-12-05 12:00:45');
      
      // Deve tratar como 08:00 e 12:00
      expect(calculateSecondsDifference(start, end)).toBe(14400);
    });

    test('deve calcular diferença negativa corretamente', () => {
      const start = new Date('2025-12-05 12:00:00');
      const end = new Date('2025-12-05 08:00:00');
      
      expect(calculateSecondsDifference(start, end)).toBe(-14400);
    });
  });

  describe('calculateMinutesDifference', () => {
    test('deve calcular diferença em minutos', () => {
      const start = new Date('2025-12-05 08:00:00');
      const end = new Date('2025-12-05 12:00:00');
      
      expect(calculateMinutesDifference(start, end)).toBe(240); // 4h = 240min
    });

    test('deve ignorar segundos', () => {
      const start = new Date('2025-12-05 08:00:30');
      const end = new Date('2025-12-05 12:00:45');
      
      expect(calculateMinutesDifference(start, end)).toBe(240);
    });
  });

  describe('timeToSeconds', () => {
    test('deve converter HH:mm para segundos', () => {
      expect(timeToSeconds('00:00')).toBe(0);
      expect(timeToSeconds('00:01')).toBe(60);
      expect(timeToSeconds('01:00')).toBe(3600);
      expect(timeToSeconds('08:00')).toBe(28800);
      expect(timeToSeconds('12:30')).toBe(45000);
      expect(timeToSeconds('23:59')).toBe(86340);
    });
  });
});






