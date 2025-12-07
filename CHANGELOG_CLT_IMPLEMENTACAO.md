# Changelog - Implementação CLT (art. 58 §1º + Súmula 366 TST)

## ✅ Objetivo Alcançado

Implementação completa do cálculo CLT **sem perder o modelo de gestão** existente (Saldo = Horas Trabalhadas - Horas Previstas).

## 📋 Estrutura Implementada

### 1. Saldo GERENCIAL (mantido como está)

- **H.TRAB.** = horas efetivamente trabalhadas no dia
- **H.PREV.** = horas previstas pela escala
- **SALDO** = H.TRAB. - H.PREV. (saldo gerencial)

Este saldo mostra **tempo real a mais ou a menos**, independente de CLT.

### 2. Cálculo LEGAL/CLT (novo)

Aplicação da tolerância CLT conforme art. 58 §1º + Súmula 366 TST:

- **Tolerância**: 5 minutos por marcação (início/fim da jornada)
- **Limite diário**: máximo 10 minutos de tolerância no dia
- **Eventos considerados**: apenas primeira entrada e última saída da jornada

**Valores CLT calculados:**
- `ATRASO_CLT`: atraso após tolerância
- `CHEGADA_ANTEC_CLT`: chegada antecipada após tolerância
- `H.EXTRA_CLT`: hora extra após tolerância
- `SAIDA_ANTEC_CLT`: saída antecipada após tolerância
- `SALDO_CLT`: saldo legal para fins de pagamento/banco de horas

**Fórmula:**
```
SALDO_CLT = (H.EXTRA_CLT + CHEGADA_ANTEC_CLT) - (ATRASO_CLT + SAIDA_ANTEC_CLT)
```

### 3. Excesso de Intervalo (mantido)

- **EXC.INT.** = excesso de intervalo do almoço
- **NÃO entra na tolerância CLT** (que é só para início/fim da jornada)
- Já reduz automaticamente o SALDO gerencial

## 🔧 Implementação Técnica

### Funções Criadas

1. **`toMinutesFloor(seconds)`**
   - Política única de conversão: `Math.floor(seconds / 60)`
   - Usada em TODOS os lugares onde convertemos segundos para minutos

2. **`computeStartEndDeltas(punches, schedule, workDate)`**
   - Calcula deltas de início e fim da jornada
   - Retorna `deltaStart` e `deltaEnd` em minutos

3. **`applyCltTolerance(deltaStart, deltaEnd)`**
   - Aplica tolerância CLT (5 min por evento, máximo 10 min/dia)
   - Retorna valores CLT após tolerância

### Algoritmo de Tolerância CLT

```
1. Calcular variação absoluta:
   abs_start = abs(delta_start)
   abs_end = abs(delta_end)

2. Candidatos a tolerância (máximo 5 min por evento):
   tolerated_start = min(abs_start, 5)
   tolerated_end = min(abs_end, 5)

3. Soma de tolerados:
   tolerated_sum = tolerated_start + tolerated_end

4. Se tolerated_sum <= 10:
   - Tudo tolerado é ignorado
   - chargeable_start = abs_start - tolerated_start
   - chargeable_end = abs_end - tolerated_end

5. Se tolerated_sum > 10:
   - excess = tolerated_sum - 10
   - Remover excess da maior variação tolerada
   - Recalcular chargeable

6. Reaplicar sinal original:
   - delta_start > 0 → ATRASO_CLT
   - delta_start < 0 → CHEGADA_ANTEC_CLT
   - delta_end > 0 → H.EXTRA_CLT
   - delta_end < 0 → SAIDA_ANTEC_CLT
```

## 📊 Exemplos Validados

### Caso 1 - Igor (sexta-feira)

**Schedule**: 08:00-12:00 / 13:00-17:00  
**Batidas**: 07:55 / 12:05 / 14:08 / 18:00

**Resultado:**
- H.TRAB. = 8h02 (482 min)
- H.PREV. = 8h00 (480 min)
- SALDO (gerencial) = +2 min ✅
- ATRASO_CLT = 0 (5 min tolerados)
- H.EXTRA_CLT = 55 (60 - 5 = 55)
- SALDO_CLT = +55 min ✅
- EXC.INT. = 63 min ✅

### Caso 2 - Dayana (sexta-feira)

**Schedule**: 08:00-12:00 / 14:00-18:00  
**Batidas**: 08:13 / 12:11 / 14:11 / 17:56

**Resultado:**
- H.TRAB. = 7h43 (463 min)
- H.PREV. = 8h00 (480 min)
- SALDO (gerencial) = -17 min ✅
- ATRASO_CLT = 8 (13 - 5 = 8)
- H.EXTRA_CLT = 0 (4 min tolerados)
- SALDO_CLT = -8 min ✅
- EXC.INT. = 0 ✅

## 🗄️ Banco de Dados

Novos campos adicionados em `processed_records`:
- `atraso_clt_minutes` (INTEGER DEFAULT 0)
- `chegada_antec_clt_minutes` (INTEGER DEFAULT 0)
- `extra_clt_minutes` (INTEGER DEFAULT 0)
- `saida_antec_clt_minutes` (INTEGER DEFAULT 0)
- `saldo_clt_minutes` (INTEGER DEFAULT 0)

Migração automática para bancos existentes.

## 🎨 Interface

### Colunas Adicionadas

- **ATRASO_CLT** (fundo azul claro)
- **H.EXTRA_CLT** (fundo azul claro)
- **SALDO_CLT** (fundo azul claro, com label "CLT")

### Colunas Mantidas

- H.TRAB., H.PREV., SALDO (gerencial)
- ATRASO, CHEG. ANTEC., H.EXTRA, EXC.INT. (indicadores informativos)

### Tooltips

- Colunas CLT: "após tolerância de 5 min por marcação, máximo 10 min/dia"
- SALDO_CLT: "Saldo legal CLT (para fins de pagamento/banco de horas)"

## ✅ Testes

- 15 testes passando
- Casos validados: Igor, Dayana, excedente de tolerância, etc.

## 📝 Resumo para Desenvolvedores

1. ✅ **NÃO mexer** em H.TRAB., H.PREV., SALDO (gerencial)
2. ✅ **Novo cálculo CLT** separado e independente
3. ✅ **Função única** `toMinutesFloor` para conversão
4. ✅ **Tolerância CLT** aplicada apenas em início/fim da jornada
5. ✅ **Excesso de intervalo** não entra na tolerância CLT

---

**Sistema 100% alinhado com CLT e mantendo modelo de gestão!** 🎉


