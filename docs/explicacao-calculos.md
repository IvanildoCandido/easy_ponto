# Explicação dos Cálculos CLT - Art. 58 §1º

## Regras CLT Aplicadas

1. **Tolerância de 5 minutos por batida**: Se a diferença entre o horário real e previsto for ≤ 5 minutos, considera como 0 (tolerado).
2. **Excedente**: Se a diferença > 5 minutos, considera apenas o **EXCEDENTE** (diferença - 5 minutos).
3. **Teto diário de 10 minutos**: Não zera valores individuais, apenas afeta o cálculo final do saldo.

## Análise dos Dados da Tabela

### 📅 12/12/2025 (SEX)

**Batidas Reais:**
- Entrada: 13:04
- Saída Intervalo: 17:10
- Entrada Pós-Intervalo: 17:37
- Saída Final: 18:45

**Resultado na Tabela:**
- H.EXTRA_CLT: 40min
- SALDO_CLT: 40min+

**Cálculo Manual (assumindo horário previsto 13:00 - 18:00):**

1. **Delta Entrada**: 13:04 - 13:00 = **+4 minutos** (atraso)
   - |4| ≤ 5 → **TOLERADO** → atrasoBruto = 0min

2. **Delta Saída**: 18:45 - 18:00 = **+45 minutos** (hora extra)
   - |45| > 5 → **EXCEDENTE** = 45 - 5 = **40 minutos**
   - extraBruto = 40min

3. **Saldo CLT**: (40min extra + 0min cheg.antec) - (0min atraso + 0min saida.antec) = **40min** ✅

**✅ CORRETO!**

---

### 📅 11/12/2025 (QUI)

**Batidas Reais:**
- Entrada: 13:02
- Saída Intervalo: 17:14
- Entrada Pós-Intervalo: 17:33
- Saída Final: 19:04

**Resultado na Tabela:**
- H.EXTRA_CLT: 59min
- SALDO_CLT: 59min+

**Cálculo Manual (assumindo horário previsto 13:00 - 18:00):**

1. **Delta Entrada**: 13:02 - 13:00 = **+2 minutos** (atraso)
   - |2| ≤ 5 → **TOLERADO** → atrasoBruto = 0min

2. **Delta Saída**: 19:04 - 18:00 = **+64 minutos** (hora extra)
   - |64| > 5 → **EXCEDENTE** = 64 - 5 = **59 minutos**
   - extraBruto = 59min

3. **Saldo CLT**: (59min extra + 0min cheg.antec) - (0min atraso + 0min saida.antec) = **59min** ✅

**✅ CORRETO!**

---

### 📅 10/12/2025 (QUA)

**Batidas Reais:**
- Entrada: 13:04
- Saída Intervalo: 17:00
- Entrada Pós-Intervalo: 17:20
- Saída Final: 18:34

**Resultado na Tabela:**
- H.EXTRA_CLT: 29min
- SALDO_CLT: 29min+

**Cálculo Manual (assumindo horário previsto 13:00 - 18:00):**

1. **Delta Entrada**: 13:04 - 13:00 = **+4 minutos** (atraso)
   - |4| ≤ 5 → **TOLERADO** → atrasoBruto = 0min

2. **Delta Saída**: 18:34 - 18:00 = **+34 minutos** (hora extra)
   - |34| > 5 → **EXCEDENTE** = 34 - 5 = **29 minutos**
   - extraBruto = 29min

3. **Saldo CLT**: (29min extra + 0min cheg.antec) - (0min atraso + 0min saida.antec) = **29min** ✅

**✅ CORRETO!**

---

### 📅 09/12/2025 (TER)

**Batidas Reais:**
- Entrada: 12:59
- Saída Intervalo: 17:09
- Entrada Pós-Intervalo: 17:24
- Saída Final: 18:15

**Resultado na Tabela:**
- H.EXTRA_CLT: 10min
- SALDO_CLT: 10min+

**Cálculo Manual (assumindo horário previsto 13:00 - 18:00):**

1. **Delta Entrada**: 12:59 - 13:00 = **-1 minuto** (chegada antecipada)
   - |1| ≤ 5 → **TOLERADO** → chegadaAntecBruto = 0min

2. **Delta Saída**: 18:15 - 18:00 = **+15 minutos** (hora extra)
   - |15| > 5 → **EXCEDENTE** = 15 - 5 = **10 minutos**
   - extraBruto = 10min

3. **Saldo CLT**: (10min extra + 0min cheg.antec) - (0min atraso + 0min saida.antec) = **10min** ✅

**✅ CORRETO!**

---

### 📅 06/12/2025 (SÁB)

**Batidas Reais:**
- Entrada: 07:54
- Saída Intervalo: E. Batida
- Entrada Pós-Intervalo: E. Batida
- Saída Final: 14:00

**Resultado na Tabela:**
- H.EXTRA_CLT: -
- SALDO_CLT: 1min+

**Observação**: Este dia tem ocorrência "E. Batida" (esquecimento de batida), então o cálculo pode ser diferente ou pode haver uma escala especial para sábado.

---

### 📅 05/12/2025 (SEX)

**Batidas Reais:**
- Entrada: 12:54
- Saída Intervalo: E. Batida
- Entrada Pós-Intervalo: E. Batida
- Saída Final: 18:19

**Resultado na Tabela:**
- H.EXTRA_CLT: 14min
- SALDO_CLT: 15min+

**Observação**: Este dia também tem ocorrência "E. Batida", então o cálculo pode considerar apenas entrada e saída final.

**Cálculo Manual (assumindo horário previsto 13:00 - 18:00):**

1. **Delta Entrada**: 12:54 - 13:00 = **-6 minutos** (chegada antecipada)
   - |6| > 5 → **EXCEDENTE** = 6 - 5 = **1 minuto**
   - chegadaAntecBruto = 1min

2. **Delta Saída**: 18:19 - 18:00 = **+19 minutos** (hora extra)
   - |19| > 5 → **EXCEDENTE** = 19 - 5 = **14 minutos**
   - extraBruto = 14min

3. **Saldo CLT**: (14min extra + 1min cheg.antec) - (0min atraso + 0min saida.antec) = **15min** ✅

**✅ CORRETO!**

---

## Conclusão

Os cálculos estão **CORRETOS** conforme a lógica CLT implementada:

1. ✅ Tolerância de 5 minutos por batida está sendo aplicada corretamente
2. ✅ Excedente (diferença - 5) está sendo calculado corretamente
3. ✅ Saldo CLT está sendo calculado corretamente (extra + chegada_antec) - (atraso + saida_antec)

## Possíveis Problemas

Se você acha que os cálculos estão errados, pode ser por:

1. **Horário previsto incorreto**: O sistema pode estar usando um horário diferente do esperado. Verifique a escala configurada no banco de dados.

2. **Interpretação da regra CLT**: A regra atual considera apenas o **excedente** quando a diferença > 5 minutos. Se você espera que seja considerado o **total** da diferença (não apenas o excedente), isso seria uma mudança na interpretação da regra.

3. **Teto diário de 10 minutos**: Atualmente, o teto não zera valores individuais. Se você espera que valores sejam zerados quando o saldo total está entre -10 e +10 minutos, isso também seria uma mudança.

## Próximos Passos

Para verificar se há algum problema, precisamos:

1. Verificar qual é o **horário previsto** configurado no banco de dados para Maria Raquel
2. Confirmar se a **interpretação da regra CLT** está correta (excedente vs total)
3. Verificar se o **teto diário de 10 minutos** deve zerar valores individuais ou não






