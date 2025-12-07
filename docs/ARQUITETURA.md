# Refatoração de Arquitetura - Easy Ponto

## Resumo das Mudanças

Esta refatoração reorganizou o código seguindo princípios de Clean Architecture, separando responsabilidades em camadas bem definidas.

## Nova Estrutura de Diretórios

### `domain/` - Camada de Domínio (Lógica Pura)
Contém toda a lógica de negócio pura, sem dependências de framework ou infraestrutura:

- **`time-utils.ts`**: Utilitários para manipulação de tempo
  - `toMinutesFloor()`: Converte segundos para minutos (floor)
  - `calculateSecondsDifference()`: Calcula diferença em segundos entre duas datas
  - `calculateMinutesDifference()`: Calcula diferença em minutos
  - `timeToSeconds()`: Converte HH:mm para segundos

- **`clt-tolerance.ts`**: Lógica de tolerância CLT (art. 58 §1º + Súmula 366 TST)
  - `applyCltTolerance()`: Aplica tolerância de 5 min por evento, teto de 10 min/dia
  - `computeStartEndDeltas()`: Calcula deltas de início/fim da jornada

- **`time-calculation.ts`**: Cálculo principal de ponto
  - `computeDaySummaryV2()`: Calcula resumo completo do dia
  - Funções auxiliares: `calculateWorkedTime()`, `calculateExpectedTime()`, `calculateIndicators()`, etc.

### `application/` - Camada de Aplicação (Casos de Uso)
Orquestra a lógica de domínio e coordena com a infraestrutura:

- **`daily-calculation-service.ts`**: Serviço de cálculo diário
  - `calculateDailyRecords()`: Processa registros de um dia e salva no banco
  - Orquestra: busca dados, identifica batidas, calcula usando domínio, salva resultados

### `infrastructure/` - Camada de Infraestrutura
Acesso a recursos externos (banco de dados, arquivos, APIs):

- **`database.ts`**: Acesso ao banco de dados
  - Suporta SQLite (dev) e Postgres/Supabase (prod)
  - `query()`, `queryOne()`: Funções de consulta

- **`file-processor.ts`**: Processamento de arquivos
  - `parseFileContent()`: Parse de arquivos de ponto
  - `processTimeRecords()`: Salva registros no banco

## Arquivos de Compatibilidade

Para manter compatibilidade com código existente, foram criados arquivos de reexport em `lib/`:

- `lib/calculate.ts` → reexporta de `application/daily-calculation-service.ts`
- `lib/db.ts` → reexporta de `infrastructure/database.ts`
- `lib/processFile.ts` → reexporta de `infrastructure/file-processor.ts`
- `lib/calculation-core-v2.ts` → reexporta de `domain/time-calculation.ts`

**Nota**: Estes arquivos estão marcados como `@deprecated` e devem ser migrados gradualmente.

## Benefícios da Refatoração

1. **Separação de Responsabilidades**: Cada camada tem uma responsabilidade clara
2. **Testabilidade**: Lógica de domínio é pura e fácil de testar
3. **Manutenibilidade**: Código mais organizado e fácil de encontrar
4. **Reutilização**: Utilitários podem ser reutilizados em diferentes contextos
5. **Escalabilidade**: Estrutura preparada para crescimento

## Regras de Negócio Preservadas

✅ Todas as regras de cálculo foram preservadas:
- Saldo = Horas Trabalhadas - Horas Previstas
- Tolerância CLT: 5 min por evento, teto de 10 min/dia
- Cálculo em segundos com conversão para minutos apenas no final
- Excesso de intervalo separado de atraso

## Próximos Passos (Opcional)

1. Migrar gradualmente os imports para usar os novos caminhos diretamente
2. Remover arquivos de compatibilidade após migração completa
3. Adicionar mais testes unitários para a camada de domínio
4. Considerar criar uma camada de apresentação separada para componentes React

## Compatibilidade

✅ Todos os testes existentes continuam funcionando
✅ APIs mantêm os mesmos contratos
✅ UI continua exibindo os mesmos dados
✅ Nenhuma quebra de funcionalidade

