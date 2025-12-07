# Changelog - Refatoração do Cálculo CLT

## ✅ Correções Implementadas

### 1. Separação Clara de Apurações

#### (A) Horas Trabalhadas (Produção de Horas)
- **Calculado SOMENTE pelos intervalos reais** (sem tolerância)
- Jornada integral (4 batidas): `worked = (saida_almoco - entrada_manha) + (saida_tarde - entrada_tarde)`
- Jornada parcial (2 batidas): `worked = (saida - entrada)`
- Não tem tolerância CLT; é tempo efetivo

#### (B) Atraso/Hora extra/Saldo (Jornada)
- **Aplicar tolerância CLT APENAS em eventos de JORNADA** (início/fim do dia)
- Tolerância por marcação: até 5 min
- Limite diário: 10 min totais tolerados

### 2. Eventos de Jornada vs Intervalo

**Eventos de Jornada** (para tolerância CLT):
- **Jornada integral (4 batidas)**: 
  - Início = entrada manhã
  - Fim = saída tarde
- **Jornada parcial (2 batidas)**:
  - Início = primeira entrada válida
  - Fim = última saída válida

**Eventos de Intervalo** (NÃO para tolerância CLT):
- Saída almoço
- Entrada tarde
- Servem apenas para:
  - Cálculo de horas trabalhadas
  - Validação do intervalo (mínimo, etc.)

### 3. Implementação da Tolerância CLT

Para cada evento de jornada (início/fim):
```
delta = minutos(Reais - Previsto)

Se abs(delta) <= 5:
  chargeable = 0
  tolerated = abs(delta)
Senão:
  chargeable = abs(delta)
  tolerated = 0
```

Teto diário:
```
tolerated_sum = Σ tolerated (apenas eventos de jornada)

Se tolerated_sum > 10:
  excedente = tolerated_sum - 10
  Retire tolerância de forma determinística
  Convertendo "excedente" em chargeable
```

Classificação:
- **Início do dia**: delta > 0 => ATRASO, delta < 0 => CHEGADA_ANTECIPADA
- **Fim do dia**: delta > 0 => HORA_EXTRA, delta < 0 => SAIDA_ANTECIPADA

Saldo:
```
SALDO = (HORA_EXTRA + CHEGADA_ANTECIPADA) - (ATRASO + SAIDA_ANTECIPADA)
```

### 4. Bug Corrigido - Caso Dayana

**Antes (ERRADO)**:
- Escala: 08:00/12:00/14:00/18:00
- Batidas: 08:13/12:11/14:11/17:56
- Resultado: ATRASO=14, EXTRA=11 (incorreto - saída almoço gerava extra)

**Agora (CORRETO)**:
- Horas trabalhadas = 463 min (7h 43min) ✅
- Atraso: apenas entrada manhã 08:13 vs 08:00 = +13 min (fora da tolerância) = **13 min** ✅
- Hora extra: apenas saída tarde 17:56 vs 18:00 = -4 min (dentro da tolerância) = **0 min** ✅
- Resultado: **ATRASO=13, EXTRA=0, SALDO=-13** ✅

### 5. Testes Implementados

✅ Tolerância <=5 e teto 10 (eventos de jornada)
✅ Jornada integral usando só início/fim
✅ Jornada parcial 2 batidas
✅ Caso Dayana: não computa extra no almoço
✅ Saída almoço não gera extra/atraso

## 📋 Arquivos Modificados

1. `lib/calculation-core-clt.ts` - Refatorado completamente
2. `lib/__tests__/calculation-core-clt.test.ts` - Testes atualizados
3. `lib/calculate.ts` - Já estava usando a função correta

## 🎯 Resultado Final

- ✅ Horas trabalhadas calculadas corretamente (intervalos reais)
- ✅ Tolerância CLT aplicada apenas em eventos de jornada
- ✅ Saída almoço e entrada tarde NÃO geram atraso/extra
- ✅ Caso Dayana corrigido: ATRASO=13, EXTRA=0, SALDO=-13
- ✅ Todos os testes passando (11 testes)

---

**Sistema pronto para uso!** 🎉


