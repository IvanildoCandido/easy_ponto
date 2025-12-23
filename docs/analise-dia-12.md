# Análise do Dia 12/12/2025 - Excesso de Intervalo

## Batidas do Dia 12/12/2025 (SEX)

**Batidas Reais:**
- Entrada: 13:04
- Saída Intervalo: 17:10
- Entrada Pós-Intervalo: 17:37
- Saída Final: 18:45

**Cálculo do Intervalo:**
- Intervalo Real: 17:37 - 17:10 = **27 minutos**

**Assumindo intervalo previsto de 1 hora (60 minutos):**
- Intervalo Previsto: 60 minutos
- Excesso de Intervalo: 27 - 60 = **-33 minutos** (não há excesso, está dentro)

**Mas se o intervalo previsto for menor (ex: 20 minutos para horistas):**
- Intervalo Previsto: 20 minutos
- Excesso de Intervalo: 27 - 20 = **7 minutos de excesso**

## Problema Identificado

No código atual (`domain/time-calculation.ts`, linha 583-588), o comentário diz:

```typescript
// IMPORTANTE: O excesso de intervalo é apenas um indicador separado e NÃO afeta o cálculo CLT
// Os valores CLT são calculados apenas com base nos deltas de entrada/saída
// O excesso de intervalo é registrado separadamente como informação adicional
```

**MAS** na linha 551, há um comentário antigo que diz:

```typescript
// IMPORTANTE: Excesso de intervalo é descontado das horas extras
```

Isso é **CONTRADITÓRIO**! 

## Regra CLT sobre Excesso de Intervalo

De acordo com a CLT e jurisprudência:
- O excesso de intervalo **deve ser descontado das horas extras** trabalhadas
- Se o funcionário trabalhou 45 minutos a mais, mas excedeu 7 minutos no intervalo, então as horas extras devem ser 45 - 7 = 38 minutos

## Cálculo Correto para o Dia 12/12/2025

**Cenário 1: Intervalo previsto = 60 minutos (1 hora)**
- Intervalo real: 27 minutos
- Excesso: 0 minutos (está dentro)
- Delta Saída: 18:45 - 18:00 = +45 minutos
- Excedente (após tolerância de 5min): 45 - 5 = 40 minutos
- **H.EXTRA_CLT: 40 minutos** ✅ (sem desconto, pois não há excesso)

**Cenário 2: Intervalo previsto = 20 minutos (horista)**
- Intervalo real: 27 minutos
- Excesso: 27 - 20 = 7 minutos
- Delta Saída: 18:45 - 18:00 = +45 minutos
- Excedente (após tolerância de 5min): 45 - 5 = 40 minutos
- **H.EXTRA_CLT deveria ser: 40 - 7 = 33 minutos** ❌ (atualmente está 40min)

## Conclusão

O sistema **NÃO está descontando o excesso de intervalo das horas extras CLT**, o que é um erro. O excesso de intervalo deve ser descontado das horas extras trabalhadas.





