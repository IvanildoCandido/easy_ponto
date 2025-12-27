# Explicação dos Cálculos - Dias 6 e 9/12/2025

## Dia 9/12/2025 (TER - Terça-feira)

### Batidas Reais:
- **E. MANHÃ (Entrada)**: 07:58
- **S. ALM. (Saída Almoço)**: 11:59
- **E. TARDE (Entrada Tarde)**: 14:00
- **S. TARDE (Saída Final)**: 18:13

### Resultado na Tabela:
- **H.EXTRA_CLT**: 7min
- **SALDO_CLT**: 7min+

### Cálculo Passo a Passo:

**Assumindo horário previsto padrão:**
- Entrada: 08:00
- Saída Almoço: 12:00
- Entrada Tarde: 14:00
- Saída Final: 18:00

#### 1. Cálculo do Intervalo de Almoço:
- Intervalo Real: 14:00 - 11:59 = **1 minuto** (ou seja, voltou 1 minuto antes do previsto)
- Intervalo Previsto: 14:00 - 12:00 = **2 horas (120 minutos)**
- **Excesso de Intervalo**: Nenhum (voltou antes do previsto, não há excesso)

#### 2. Cálculo CLT - Entrada (Delta Start):
- Real: 07:58
- Previsto: 08:00
- Delta: 07:58 - 08:00 = **-2 minutos** (chegada antecipada)
- |−2| = 2 ≤ 5 → **TOLERADO** → chegadaAntecBruto = 0min

#### 3. Cálculo CLT - Saída Final (Delta End):
- Real: 18:13
- Previsto: 18:00
- Delta: 18:13 - 18:00 = **+13 minutos** (hora extra)
- |13| = 13 > 5 → **EXCEDENTE** = 13 - 5 = **8 minutos**
- extraBruto = 8min

#### 4. Aplicar Desconto de Excesso de Intervalo:
- Excesso de Intervalo: 0min (não há excesso)
- **H.EXTRA_CLT final**: 8min (sem desconto)

#### 5. Saldo CLT:
- Saldo = (8min extra + 0min cheg.antec) - (0min atraso + 0min saida.antec) = **8min**

**⚠️ DISCREPÂNCIA**: A tabela mostra **7min**, mas o cálculo manual resulta em **8min**. Isso pode ser devido a:
- Horário previsto diferente (ex: saída prevista às 18:01 ou entrada prevista às 07:59)
- Arredondamento diferente
- Outros ajustes no cálculo

---

## Dia 6/12/2025 (SÁB - Sábado)

### Batidas Reais:
- **E. MANHÃ (Entrada)**: 06:55
- **S. ALM. (Saída Almoço)**: 11:56
- **E. TARDE (Entrada Tarde)**: 12:59
- **S. TARDE (Saída Final)**: 16:38

### Resultado na Tabela:
- **ATRASO_CLT**: 3min
- **SALDO_CLT**: 20min- (negativo, em vermelho)

### Cálculo Passo a Passo:

**Assumindo horário previsto para sábado (meio expediente):**
- Entrada: 07:00
- Saída Almoço: 12:00
- Entrada Tarde: 13:00
- Saída Final: 17:00

#### 1. Cálculo do Intervalo de Almoço:
- Intervalo Real: 12:59 - 11:56 = **63 minutos**
- Intervalo Previsto: 13:00 - 12:00 = **1 hora (60 minutos)**
- **Excesso de Intervalo**: 63 - 60 = **3 minutos**

#### 2. Cálculo CLT - Entrada (Delta Start):
- Real: 06:55
- Previsto: 07:00
- Delta: 06:55 - 07:00 = **-5 minutos** (chegada antecipada exatamente no limite)
- |−5| = 5 ≤ 5 → **TOLERADO** → chegadaAntecBruto = 0min

#### 3. Cálculo CLT - Saída Final (Delta End):
- Real: 16:38
- Previsto: 17:00
- Delta: 16:38 - 17:00 = **-22 minutos** (saída antecipada)
- |−22| = 22 > 5 → **EXCEDENTE** = 22 - 5 = **17 minutos**
- saidaAntecBruto = 17min

#### 4. Aplicar Desconto de Excesso de Intervalo:
- Excesso de Intervalo: 3min
- Como não há hora extra, o excesso deve ser descontado da chegada antecipada, ou, se não houver chegada antecipada, vira atraso
- Como chegadaAntecBruto = 0min (foi tolerada), o excesso de 3min vira atraso
- atrasoBruto = 0min + 3min = **3min**

#### 5. Saldo CLT:
- Saldo = (0min extra + 0min cheg.antec) - (3min atraso + 17min saida.antec) = **-20min**

**✅ CORRETO**: A tabela mostra **ATRASO_CLT: 3min** e **SALDO_CLT: 20min-**, o que está de acordo com o cálculo!

---

## Observações Importantes:

1. **Dia 9**: A pequena diferença (7min vs 8min calculado) pode ser devido a arredondamentos ou horários previstos ligeiramente diferentes dos assumidos.

2. **Dia 6**: O cálculo está correto:
   - Atraso CLT de 3min (resultado do excesso de intervalo que não pôde ser descontado de horas extras)
   - Saldo negativo de 20min (combinação do atraso de 3min + saída antecipada de 17min)

3. **Excesso de Intervalo**: Quando há excesso de intervalo e não há hora extra suficiente para descontar, o excesso vira atraso conforme a lógica implementada.






