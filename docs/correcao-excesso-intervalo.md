# Correção: Desconto de Excesso de Intervalo nas Horas Extras CLT

## Problema Identificado

O sistema **não estava descontando o excesso de intervalo das horas extras CLT**. Conforme a CLT e jurisprudência trabalhista, quando um funcionário excede o intervalo previsto para almoço/descanso, esse tempo deve ser **descontado das horas extras** trabalhadas.

## Exemplo - Dia 12/12/2025

**Batidas:**
- Entrada: 13:04
- Saída Intervalo: 17:10
- Entrada Pós-Intervalo: 17:37
- Saída Final: 18:45

**Cálculo:**
- Intervalo Real: 17:37 - 17:10 = **27 minutos**
- Se intervalo previsto = 20 minutos (horista): **Excesso = 7 minutos**
- Delta Saída: 18:45 - 18:00 = +45 minutos
- Após tolerância de 5min: 45 - 5 = **40 minutos de hora extra**

**Antes da Correção:**
- H.EXTRA_CLT = 40 minutos ❌ (não descontava os 7 minutos de excesso)

**Depois da Correção:**
- H.EXTRA_CLT = 40 - 7 = **33 minutos** ✅ (desconta o excesso de intervalo)

## Lógica Implementada

O desconto do excesso de intervalo segue esta ordem de prioridade:

1. **Primeiro**: Desconta das horas extras (`extraBrutoMinutes`)
   - Se há hora extra suficiente, desconta tudo dela

2. **Segundo**: Se não há hora extra suficiente, desconta também da chegada antecipada (`chegadaAntecBrutoMinutes`)
   - Desconta o que pode da hora extra e o restante da chegada antecipada

3. **Terceiro**: Se não há hora extra, desconta apenas da chegada antecipada

4. **Último recurso**: Se não há horas extras nem chegada antecipada suficiente, o excesso vira atraso
   - Adiciona ao `atrasoBrutoMinutes`

## Código Modificado

Arquivo: `domain/time-calculation.ts`

**Antes:**
```typescript
// IMPORTANTE: O excesso de intervalo é apenas um indicador separado e NÃO afeta o cálculo CLT
if (intervalExcess.intervalExcessMinutes > 0) {
  logs.push(`ℹ️ Excesso de intervalo detectado: ${intervalExcess.intervalExcessMinutes}min (indicador separado, não afeta cálculo CLT)`);
}
extraCltMinutes = extraBrutoMinutes; // Não descontava
```

**Depois:**
```typescript
// IMPORTANTE: O excesso de intervalo DEVE ser descontado das horas extras CLT
if (intervalExcess.intervalExcessMinutes > 0) {
  logs.push(`⚠️ Excesso de intervalo detectado: ${intervalExcess.intervalExcessMinutes}min (será descontado das horas extras)`);
  
  // Descontar excesso de intervalo das horas extras (prioridade: extraBruto > chegadaAntec)
  if (extraBrutoMinutes >= intervalExcess.intervalExcessMinutes) {
    extraBrutoMinutes = extraBrutoMinutes - intervalExcess.intervalExcessMinutes;
  } else if (extraBrutoMinutes > 0) {
    const restanteExcesso = intervalExcess.intervalExcessMinutes - extraBrutoMinutes;
    chegadaAntecBrutoMinutes = Math.max(0, chegadaAntecBrutoMinutes - restanteExcesso);
    extraBrutoMinutes = 0;
  } else if (chegadaAntecBrutoMinutes >= intervalExcess.intervalExcessMinutes) {
    chegadaAntecBrutoMinutes = chegadaAntecBrutoMinutes - intervalExcess.intervalExcessMinutes;
  } else {
    const restanteExcesso = intervalExcess.intervalExcessMinutes - chegadaAntecBrutoMinutes;
    atrasoBrutoMinutes = atrasoBrutoMinutes + restanteExcesso;
    chegadaAntecBrutoMinutes = 0;
  }
}
extraCltMinutes = extraBrutoMinutes; // Agora já tem o desconto aplicado
```

## Impacto

Esta correção afeta:
- ✅ Cálculo de horas extras CLT (`extraCltMinutes`)
- ✅ Saldo CLT (`saldoCltMinutes`)
- ✅ Valores para pagamento em folha (se aplicável)

## Base Legal

Conforme jurisprudência trabalhista, o tempo excedente do intervalo de almoço/descanso deve ser considerado como tempo não trabalhado, e portanto deve ser descontado do tempo trabalhado a mais (horas extras).

