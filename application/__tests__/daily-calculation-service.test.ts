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
      query.mockResolvedValueOnce(mockRecords);
      queryOne.mockResolvedValueOnce(null); // Sem schedule
      query.mockResolvedValueOnce([]); // INSERT

      await calculateDailyRecords('2025-12-05');

      expect(query).toHaveBeenCalled();
    });

    it('deve lidar com datas sem registros', async () => {
      const { query } = require('../../infrastructure/database');
      query.mockResolvedValueOnce([]);

      await calculateDailyRecords('2025-12-05');

      expect(query).toHaveBeenCalled();
    });
  });
});

