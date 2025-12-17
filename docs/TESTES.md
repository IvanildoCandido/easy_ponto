# Testes Automatizados - Easy Ponto

## Visão Geral

O projeto possui uma suíte completa de testes automatizados com alta cobertura, focada principalmente na lógica de domínio (cálculos de ponto e CLT).

## Executando Testes

```bash
# Executar todos os testes
npm test

# Executar em modo watch (desenvolvimento)
npm run test:watch

# Executar com relatório de cobertura
npm run test:coverage

# Executar em modo CI (com cobertura e workers limitados)
npm run test:ci
```

## Cobertura de Testes

### Meta de Cobertura

- **Global**: Mínimo de 80% em branches, functions, lines e statements
- **Domain/**: Mínimo de 90% (camada de domínio - lógica pura)

### O que é Testado

#### 1. Utilitários de Tempo (`domain/time-utils.ts`)
- ✅ Conversão de segundos para minutos (floor)
- ✅ Cálculo de diferença em segundos (ignorando segundos das batidas)
- ✅ Cálculo de diferença em minutos
- ✅ Conversão de HH:mm para segundos

#### 2. Cálculo de Ponto (`domain/time-calculation.ts`)
- ✅ Horas trabalhadas (jornada integral, parcial, casos especiais)
- ✅ Horas previstas (baseado em schedule)
- ✅ Saldo gerencial (trabalhadas - previstas)
- ✅ Indicadores informativos (atraso, extra, chegada antecipada, saída antecipada)
- ✅ Excesso de intervalo
- ✅ Status INCONSISTENTE quando faltam batidas
- ✅ Casos de fronteira (sábado com horário reduzido, jornadas parciais)

#### 3. Tolerância CLT (`domain/clt-tolerance.ts`)
- ✅ Casos reais do sistema (Dayana, Igor, Erivania, Jobson, José Felipe, Maria Raquel, Marizelma, Valdinete)
- ✅ Tolerância de 5 minutos por evento
- ✅ Teto diário de 10 minutos
- ✅ Casos de fronteira (exatamente 5 min, soma exatamente 10 min, excedente de teto)

## Casos de Teste Reais

Os testes incluem casos reais do sistema com dados de funcionários específicos:

### Dayana (LABORATÓRIO)
- Escala: 08-12 / 14-18
- Batidas: 08:13 / 12:11 / 14:11 / 17:56
- Resultado esperado: ATRASO_CLT = 8min, SALDO_CLT = -8min

### Igor (BANHOETOSA)
- Escala: 08-12 / 13-17
- Batidas: 07:55 / 12:05 / 14:08 / 18:00
- Resultado esperado: EXTRA_CLT = 55min, SALDO_CLT = +55min

### Erivania (SERVGERAIS)
- Escala: 08-12 / 13-17
- Batidas: 07:56 / 12:30 / 14:00 / 17:30
- Resultado esperado: EXTRA_CLT = 25min, SALDO_CLT = +25min

E mais casos para outros funcionários...

## Git Hooks (Husky)

O projeto utiliza **Husky** para executar testes automaticamente:

### pre-commit
- Executa `npm test` antes de cada commit
- Se os testes falharem, o commit é bloqueado

### pre-push
- Executa `npm run test:coverage` antes de cada push
- Garante que a cobertura está adequada antes de enviar código

**Comportamento**: Ao tentar commitar ou fazer push, os testes rodam automaticamente. Se falharem, a operação é cancelada para evitar quebrar funcionalidades que já estão funcionando.

## Adicionando Novos Testes

Para adicionar testes para novas regras de ponto:

1. Crie arquivos de teste em `domain/__tests__/` ou `lib/__tests__/`
2. Use os casos reais do sistema como referência
3. Execute `npm test` para validar
4. Verifique a cobertura com `npm run test:coverage`

### Estrutura de um Teste

```typescript
import { computeDaySummaryV2, type PunchTimes, type ScheduledTimes } from '../time-calculation';

describe('Nome do Teste', () => {
  test('Descrição do caso', () => {
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
      finalExit: '2025-12-05 18:00:00',
    };

    const summary = computeDaySummaryV2(punches, schedule, '2025-12-05');
    
    expect(summary.workedMinutes).toBe(480);
    expect(summary.expectedMinutes).toBe(480);
    expect(summary.balanceMinutes).toBe(0);
  });
});
```

## Manutenção dos Testes

- **NÃO altere regras de negócio** sem atualizar os testes correspondentes
- Use os relatórios de exemplo (Dayana, Igor, etc.) como verdade de referência
- Se um teste falhar, investigue se:
  1. O código está incorreto (corrija o código)
  2. O teste está incorreto (corrija o teste)
  3. A regra de negócio mudou (atualize teste e documentação)

## Relatório de Cobertura

Após executar `npm run test:coverage`, um relatório HTML é gerado em `coverage/lcov-report/index.html`.

Abra este arquivo no navegador para ver:
- Cobertura por arquivo
- Linhas não cobertas
- Branches não cobertos
- Funções não cobertas






