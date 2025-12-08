/**
 * Testes para o processamento de arquivos
 */

import { parseFileContent } from '../file-processor';

describe('FileProcessor', () => {
  describe('parseFileContent', () => {
    it('deve lançar erro para conteúdo vazio', () => {
      expect(() => parseFileContent('')).toThrow('Conteúdo do arquivo inválido ou vazio');
    });

    it('deve lançar erro para conteúdo null', () => {
      expect(() => parseFileContent(null as any)).toThrow('Conteúdo do arquivo inválido ou vazio');
    });

    it('deve lançar erro para arquivo sem cabeçalho válido', () => {
      // Arquivo com apenas uma linha (sem quebra de linha) - cabeçalho com poucas colunas
      expect(() => parseFileContent('linha1')).toThrow('Número insuficiente de colunas no cabeçalho');
      
      // Arquivo com cabeçalho insuficiente (menos de 5 colunas)
      expect(() => parseFileContent('Col1\tCol2\n1\t2')).toThrow('Número insuficiente de colunas no cabeçalho');
      
      // Arquivo com múltiplas linhas mas cabeçalho com poucas colunas
      expect(() => parseFileContent('linha1\nlinha2')).toThrow('Número insuficiente de colunas no cabeçalho');
    });

    it('deve parsear arquivo com formato correto', () => {
      const content = `EnNo\tName\tDateTime\tDepartment\tIn/Out
1\tJoão Silva\t2025-12-05 08:00:00\tTI\t1
1\tJoão Silva\t2025-12-05 12:00:00\tTI\t0`;

      const records = parseFileContent(content);
      
      expect(records).toHaveLength(2);
      expect(records[0]).toHaveProperty('EnNo', 1);
      expect(records[0]).toHaveProperty('Name', 'João Silva');
      expect(records[0]).toHaveProperty('DateTime', '2025-12-05 08:00:00');
    });

    it('deve lançar erro quando não encontra cabeçalhos obrigatórios', () => {
      const content = `Col1\tCol2\tCol3
1\t2\t3`;

      expect(() => parseFileContent(content)).toThrow();
    });

    it('deve ignorar linhas com número insuficiente de colunas', () => {
      const content = `EnNo\tName\tDateTime\tDepartment\tIn/Out
1\tJoão Silva\t2025-12-05 08:00:00\tTI\t1
2\tMaria\t2025-12-05 08:00:00
1\tJoão Silva\t2025-12-05 12:00:00\tTI\t0`;

      const records = parseFileContent(content);
      
      // Deve ignorar a linha incompleta
      expect(records).toHaveLength(2);
    });

    it('deve processar arquivo com separador de espaços', () => {
      const content = `EnNo  Name  DateTime  Department  In/Out
1  João Silva  2025-12-05 08:00:00  TI  1`;

      const records = parseFileContent(content);
      
      expect(records).toHaveLength(1);
      expect(records[0]).toHaveProperty('EnNo', 1);
    });
  });
});

