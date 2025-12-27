/**
 * Testes para o serviço de cálculo diário
 */

import { calculateDailyRecords } from '../daily-calculation-service';

// Mock do módulo de database
jest.mock('../../infrastructure/database', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
}));

// Mock do logger para evitar logs nos testes
jest.mock('../../infrastructure/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DailyCalculationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDailyRecords', () => {
    it('deve buscar registros de ponto para a data especificada', async () => {
      const mockRecords = [
        {
          employee_id: 1,
          datetime: '2025-12-05 08:00:00',
          in_out: 1,
        },
        {
          employee_id: 1,
          datetime: '2025-12-05 12:00:00',
          in_out: 0,
        },
      ];

      const { query, queryOne } = require('../../infrastructure/database');
      
      // Mock todas as chamadas de query necessárias na ordem correta
      query
        .mockResolvedValueOnce(mockRecords) // time_records para a data
        .mockResolvedValueOnce([]) // employeesWithManualCorrections
        .mockResolvedValueOnce([]) // employeesWithProcessedRecords
        .mockResolvedValueOnce([]); // INSERT no processed_records
      
      // Mock todas as chamadas de queryOne na ordem correta
      queryOne
        .mockResolvedValueOnce({ compensation_type: 'BANCO_DE_HORAS' }) // employee
        .mockResolvedValueOnce(null) // schedule override
        .mockResolvedValueOnce({ 
          id: 1,
          employee_id: 1,
          day_of_week: 5,
          morning_start: '08:00',
          morning_end: '12:00',
          afternoon_start: '14:00',
          afternoon_end: '18:00',
          shift_type: 'FULL_DAY',
          break_minutes: 60,
          interval_tolerance_minutes: 0,
        }) // schedule padrão
        .mockResolvedValueOnce(null) // manual correction
        .mockResolvedValueOnce(null); // existing record

      await calculateDailyRecords('2025-12-05');

      expect(query).toHaveBeenCalled();
    });

    it('deve lidar com datas sem registros', async () => {
      const { query } = require('../../infrastructure/database');
      
      // Mock todas as chamadas necessárias
      query
        .mockResolvedValueOnce([]) // time_records (sem registros)
        .mockResolvedValueOnce([]) // employeesWithManualCorrections
        .mockResolvedValueOnce([]); // employeesWithProcessedRecords
      
      // Não vai entrar no loop de processamento porque não há funcionários para processar

      await calculateDailyRecords('2025-12-05');

      expect(query).toHaveBeenCalled();
    });
  });
});

