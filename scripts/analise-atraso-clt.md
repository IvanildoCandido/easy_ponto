# Análise: Por que ATRASO_CLT aparece para alguns e não para outros?

## Casos na Tabela:

### Marizelma - Dia 6/12/2025 (SÁB):
- **ATRASO_CLT**: 3min ✅ (aparece)
- **H.EXTRA_CLT**: - (não há)
- **SALDO_CLT**: 20min- (negativo)

**Cálculo:**
- Excesso de intervalo: 3min
- Não há hora extra para descontar
- Não há chegada antecipada suficiente
- **Excesso vira atraso**: 3min ✅

### Maria Raquel - Dia 12/12/2025 (SEX):
- **ATRASO_CLT**: - (não aparece)
- **H.EXTRA_CLT**: 33min
- **SALDO_CLT**: 33min+

**Cálculo:**
- Excesso de intervalo: 7min
- Hora extra bruta: 40min
- Após desconto: 40 - 7 = 33min ✅
- **Não há atraso porque o excesso foi totalmente descontado da hora extra**

## Conclusão:

O sistema está funcionando corretamente! 

- **ATRASO_CLT aparece** quando:
  - Há excesso de intervalo que não pode ser descontado de horas extras nem de chegada antecipada
  - O excesso restante vira atraso

- **ATRASO_CLT NÃO aparece** quando:
  - Não há excesso de intervalo, OU
  - O excesso de intervalo foi totalmente descontado das horas extras/chegada antecipada

No caso de Maria Raquel, o excesso de 7min foi totalmente descontado das 40min de hora extra, resultando em 33min de hora extra e 0min de atraso. Isso está correto!



