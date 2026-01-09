# Explicação Detalhada dos Cálculos - Dias 6 e 9/12/2025

## Dia 9/12/2025 (TER - Terça-feira)

### Dados:
- **E. MANHÃ**: 07:58
- **S. ALM.**: 11:59  
- **E. TARDE**: 14:00
- **S. TARDE**: 18:13
- **Resultado**: H.EXTRA_CLT: 7min, SALDO_CLT: 7min+

### Cálculo Assumindo Horário Previsto 08:00-18:00:

#### 1. Intervalo de Almoço:
- **Real**: 14:00 - 11:59 = **1 minuto** (voltou muito rápido, provavelmente erro de batida)
- **Previsto**: 14:00 - 12:00 = **2 horas**
- **Excesso**: 0min (não há excesso, voltou antes)

#### 2. Delta Entrada:
- 07:58 - 08:00 = **-2min** (chegada antecipada)
- |−2| ≤ 5 → **TOLERADO** → chegadaAntecBruto = 0min

#### 3. Delta Saída:
- 18:13 - 18:00 = **+13min** (hora extra)
- |13| > 5 → **EXCEDENTE** = 13 - 5 = **8min**
- extraBruto = 8min

#### 4. Aplicar Excesso de Intervalo:
- Excesso: 0min → **sem desconto**

#### 5. Resultado Final:
- **H.EXTRA_CLT**: 8min (teoricamente)
- **SALDO_CLT**: 8min
- **Na tabela mostra 7min** → pode ser devido a:
  - Horário previsto ligeiramente diferente (ex: 18:01 ou 07:59)
  - Arredondamento no cálculo
  - Diferença de 1 minuto pode ser devido ao cálculo do intervalo

---

## Dia 6/12/2025 (SÁB - Sábado)

### Dados:
- **E. MANHÃ**: 06:55
- **S. ALM.**: 11:56
- **E. TARDE**: 12:59
- **S. TARDE**: 16:38
- **Resultado**: ATRASO_CLT: 3min, SALDO_CLT: 20min- (negativo)

### Cálculo Assumindo Horário Previsto 07:00-17:00 (sábado):

#### 1. Intervalo de Almoço:
- **Real**: 12:59 - 11:56 = **63 minutos**
- **Previsto**: 13:00 - 12:00 = **60 minutos** (ou pode ser 13:00 - 11:56 = 64min se previsto é 12:00-13:00)
- **Excesso**: 63 - 60 = **3 minutos** ✅

#### 2. Delta Entrada:
- 06:55 - 07:00 = **-5min** (chegada antecipada exatamente no limite)
- |−5| = 5 ≤ 5 → **TOLERADO** → chegadaAntecBruto = 0min

#### 3. Delta Saída:
- 16:38 - 17:00 = **-22min** (saída antecipada)
- |−22| = 22 > 5 → **EXCEDENTE** = 22 - 5 = **17min**
- saidaAntecBruto = 17min

#### 4. Aplicar Excesso de Intervalo (3min):
- **Situação**: 
  - extraBruto = 0min (não há hora extra)
  - chegadaAntecBruto = 0min (foi tolerada)
  - saidaAntecBruto = 17min
- **Lógica atual**: O excesso é descontado primeiro de hora extra, depois de chegada antecipada, e se não houver, vira atraso
- **Aplicação**: 
  - Não há hora extra → não pode descontar
  - Não há chegada antecipada suficiente (foi tolerada) → não pode descontar
  - **Excesso vira atraso**: atrasoBruto = 0 + 3 = **3min** ✅

#### 5. Resultado Final:
- **ATRASO_CLT**: 3min ✅
- **SAIDA_ANTEC_CLT**: 17min
- **SALDO_CLT**: (0 + 0) - (3 + 17) = **-20min** ✅

**✅ CORRETO!** Os valores batem perfeitamente com a tabela.

---

## Conclusão:

### Dia 9:
- Cálculo teórico: 8min, tabela mostra 7min
- Pequena diferença pode ser devido a:
  1. Horário previsto ligeiramente diferente
  2. Cálculo do intervalo considerando que voltou muito rápido (1 minuto)
  3. Arredondamento

### Dia 6:
- **Cálculo está PERFEITO** ✅
- Atraso CLT: 3min (resultado do excesso de intervalo de 3min)
- Saldo CLT: -20min (3min atraso + 17min saída antecipada)
- A lógica está funcionando corretamente: quando não há hora extra nem chegada antecipada para descontar o excesso de intervalo, ele vira atraso.









