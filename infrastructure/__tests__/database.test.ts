/**
 * Testes para o módulo de banco de dados
 */

import { query, queryOne } from '../database';

describe('Database', () => {
  describe('query', () => {
    it('deve executar uma query SELECT e retornar resultados', async () => {
      const result = await query('SELECT 1 as test');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('deve executar uma query com parâmetros', async () => {
      const result = await query('SELECT $1 as value', [42]);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('deve retornar array vazio para queries que não retornam dados', async () => {
      // Criar uma tabela temporária se não existir
      try {
        await query('CREATE TABLE IF NOT EXISTS test_table (id INTEGER)');
      } catch (e) {
        // Ignorar se já existe
      }
      
      const result = await query('INSERT INTO test_table (id) VALUES ($1)', [1]);
      expect(result).toEqual([]);
    });
  });

  describe('queryOne', () => {
    it('deve retornar um único resultado', async () => {
      const result = await queryOne('SELECT 1 as test');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('test');
    });

    it('deve retornar null quando não há resultados', async () => {
      const result = await queryOne('SELECT * FROM employees WHERE id = $1', [999999]);
      expect(result).toBeNull();
    });
  });
});







