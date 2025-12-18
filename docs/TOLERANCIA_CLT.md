# Como Calculamos Tolerância pela CLT (Art. 58 §1º)

## Base Legal

O sistema implementa a regra de tolerância conforme:
- **CLT, Art. 58, §1º**: Variações de até 5 (cinco) minutos em cada marcação não devem ser descontadas nem computadas como hora extra.
- **Súmula 366 do TST**: Estabelece o limite máximo diário de 10 (dez) minutos para essa desconsideração.

## Regra de Tolerância Implementada

### 1. Tolerância por Evento (5 minutos)

Para cada marcação de ponto (evento), aplicamos a seguinte regra:

- **Se |Δ| ≤ 5 minutos**: O evento é **tolerado** (zona neutra)
  - `tolerated_minutes = |Δ|`
  - `chargeable_minutes = 0`
  - Não é descontado nem computado como hora extra

- **Se |Δ| > 5 minutos**: O evento é **computável inteiro**
  - `tolerated_minutes = 0`
  - `chargeable_minutes = |Δ|` (valor inteiro, não o excedente)
  - É descontado ou computado conforme o tipo de evento

**Importante**: A regra NÃO é "passou de 5, computa só o excedente (|Δ|-5)". Ou tolera inteiro ou computa inteiro.

### 2. Teto Diário de Tolerância (10 minutos)

Após processar todos os eventos do dia, somamos os minutos tolerados:

- **Se `tolerated_sum ≤ 10 minutos`**: Mantém todos os eventos tolerados como zona neutra (ok)

- **Se `tolerated_sum > 10 minutos`**: Aplica "quebra de tolerância diária"
  - O excedente acima de 10 minutos deve ser recuperado e computado
  - Política de redistribuição: Ordena eventos tolerados do maior para o menor e reverte a tolerância até que a soma fique em 10 minutos

### 3. Classificação dos Minutos Computáveis

Após aplicar tolerância e teto diário, classificamos os minutos computáveis:

- **Entradas**:
  - `Δ > 0` → **ATRASO** += `chargeable_minutes`
  - `Δ < 0` → **CHEGADA_ANTECIPADA** += `chargeable_minutes`

- **Saídas**:
  - `Δ > 0` → **HORA_EXTRA** += `chargeable_minutes` (se política permitir)
  - `Δ < 0` → **SAIDA_ANTECIPADA** += `chargeable_minutes`

### 4. Saldo do Dia

```
SALDO = (HORA_EXTRA + CHEGADA_ANTECIPADA) - (ATRASO + SAIDA_ANTECIPADA)
```

## Modos de Operação

O sistema suporta dois modos de tolerância:

### `ONLY_START_END` (Padrão - Recomendado)

Apenas a **entrada do dia** e a **saída final** têm tolerância legal (5 minutos).

- Saída almoço e entrada tarde são sempre computáveis (sem tolerância)
- Reduz distorções com intervalos
- Mais conservador e alinhado com a interpretação usual no mercado

### `ALL_SCHEDULED_MARKS`

Todas as marcações agendadas têm tolerância (entrada manhã, saída almoço, entrada tarde, saída final).

- Mais flexível, mas pode gerar distorções
- Útil para empresas que aplicam tolerância em todas as marcações

**Configuração**: Defina a variável de ambiente `TOLERANCE_MODE`:
- `ONLY_START_END` (padrão)
- `ALL_SCHEDULED_MARKS`

## Exemplos de Cálculo

### Exemplo 1: Dentro da Tolerância

**Escala**: 08:00 / 12:00 / 14:00 / 18:00  
**Batidas**: 08:04 / 12:00 / 14:01 / 18:00

- Entrada manhã: +4 min → **Tolerado** (4 min)
- Saída almoço: 0 min
- Entrada tarde: +1 min → **Tolerado** (1 min)
- Saída final: 0 min

**Resultado**:
- `tolerated_sum = 5 min` (dentro do teto de 10 min)
- `delay_minutes = 0`
- `overtime_minutes = 0`
- `balance_minutes = 0`

### Exemplo 2: Excedeu Teto Diário

**Escala**: 08:00 / 12:00 / 14:00 / 18:00  
**Batidas**: 08:04 / 12:04 / 14:04 / 18:00

- Entrada manhã: +4 min → **Tolerado** (4 min)
- Saída almoço: +4 min → **Tolerado** (4 min)
- Entrada tarde: +4 min → **Tolerado** (4 min)
- Saída final: 0 min

**Resultado**:
- `tolerated_sum = 12 min` (excedeu 10 min!)
- `tolerated_sum_after_cap = 10 min` (teto aplicado)
- `recovered_minutes = 2 min` (recuperados e computados)
- 2 minutos são transformados em computáveis (atraso/extra)

### Exemplo 3: Fora da Tolerância Individual

**Escala**: 08:00 / 12:00 / 14:00 / 18:00  
**Batidas**: 08:06 / 12:00 / 14:00 / 18:00

- Entrada manhã: +6 min → **Computável inteiro** (6 min, não 1 min)
- `delay_minutes = 6`

### Exemplo 4: Dayana (Jornada Completa)

**Escala**: 08:00 / 12:00 / 14:00 / 18:00  
**Batidas**: 08:13 / 12:11 / 14:11 / 17:56

**Deltas**: +13, +11, +11, -4

**Processamento** (modo `ONLY_START_END`):
- Entrada manhã: +13 min → **Computável** (13 min)
- Saída almoço: +11 min → **Computável** (11 min, sem tolerância)
- Entrada tarde: +11 min → **Computável** (11 min, sem tolerância)
- Saída final: -4 min → **Tolerado** (4 min)

**Resultado**:
- `tolerated_sum = 4 min` (dentro do teto)
- `delay_minutes = 24` (13 + 11)
- `overtime_minutes = 0` (saída final tolerada)
- `early_exit_minutes = 0` (saída final tolerada)
- `worked_minutes = 463` (7h 43min)

## Horas Trabalhadas

O cálculo de horas trabalhadas é feito por intervalos reais:

- **Manhã** = `saida_almoco - entrada_manha`
- **Tarde** = `saida_tarde - entrada_tarde`
- **Total** = `manhã + tarde`

**Requisitos**:
- Calcula em minutos (ignora segundos completamente)
- Nunca trunca por período
- Se houver arredondamento, aplica apenas no total do dia

## Status INCONSISTENTE

O sistema marca como `INCONSISTENTE` quando:
- Faltam batidas necessárias para a jornada do dia
- Não é possível calcular métricas completas

Nesses casos, os cálculos podem estar incompletos e devem ser revisados manualmente.

## Auditoria e Logs

O sistema gera logs detalhados para cada cálculo:

- Escala aplicada (horários previstos)
- Batidas reais
- Deltas (minutos) por evento
- Quais eventos foram tolerados (≤5 min)
- `tolerated_sum` e se excedeu 10 min
- Como o excedente foi redistribuído
- Totais: atraso, extra, saída antecipada, chegada antecipada, saldo

Os logs estão disponíveis em modo de desenvolvimento (`NODE_ENV=development`).

## Configuração

### Variáveis de Ambiente

- `TOLERANCE_MODE`: Modo de tolerância (`ONLY_START_END` ou `ALL_SCHEDULED_MARKS`)
- `NODE_ENV`: Define se logs detalhados são exibidos (`development`)

### Parâmetros Fixos (Código)

- `TOLERANCE_PER_EVENT_MINUTES = 5`
- `TOLERANCE_DAILY_CAP_MINUTES = 10`

Esses valores podem ser ajustados no código se necessário, mas devem seguir a legislação brasileira.

## Referências

- CLT, Art. 58, §1º
- Súmula 366 do TST
- Interpretação usual em sistemas de ponto no mercado brasileiro








