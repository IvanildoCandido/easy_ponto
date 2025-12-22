# Problema nos Cálculos da Dayana

## Análise dos Dias com Problema

### Dia 6/12/2025 (SÁB):
**Batidas:** 08:19 / 11:36 / 12:32 / 15:25

**O que a tabela mostra:**
- ATRASO_CLT: 14min ✅
- H.EXTRA_CLT: 20min 
- SALDO_CLT: 6min+

**O que o sistema calcula com escala 08-12 / 13-17:**
- ATRASO_CLT: 14min ✅
- SAIDA_ANTEC_CLT: 90min ❌ (deveria ser H.EXTRA_CLT: 20min)
- SALDO_CLT: -104min ❌ (deveria ser 6min+)

**O que o sistema calcula com escala 08-12 / 13-15:**
- Entrada: 08:19 vs 08:00 = 19min, menos 5min = 14min de atraso ✅
- Saída: 15:25 vs 15:00 = 25min, menos 5min = 20min de hora extra ✅
- Saldo: -14min + 20min = 6min ✅

## Conclusão

A escala de sábado da Dayana no banco está configurada para terminar às **15:00** (não 17:00), mas o sistema está usando a escala errada (termina às 17:00).

**Solução:** Verificar se:
1. A escala de sábado no banco está correta (deve terminar às 15:00)
2. O sistema está buscando a escala correta do banco
3. Há algum problema na detecção/uso da escala de sábado



