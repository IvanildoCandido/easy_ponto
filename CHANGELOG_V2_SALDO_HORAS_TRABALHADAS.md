# Changelog - Refatoração V2: Saldo = Horas Trabalhadas - Horas Previstas

## ✅ Mudança Fundamental

### Modelo Anterior (V1)
- Saldo baseado em deltas por batida (atraso, hora extra, etc.)
- Tolerância CLT aplicada em eventos de jornada
- Complexidade na classificação de eventos

### Modelo Novo (V2) - **REGRA DE OURO**
```
SALDO = HORAS_TRABALHADAS - HORAS_PREVISTAS
```

Onde:
- **HORAS_TRABALHADAS** = soma dos períodos realmente trabalhados (diferença entre batidas)
- **HORAS_PREVISTAS** = carga horária prevista pela escala do dia

## 🎯 Vantagens do Novo Modelo

1. **Atraso no almoço** → trabalha menos → saldo negativo automaticamente ✅
2. **Saída antes** → trabalha menos → saldo negativo ✅
3. **Fica depois** → trabalha mais → saldo positivo ✅
4. **Sem "inventar" hora extra na saída do almoço** ✅
5. **Cálculo simples e transparente** ✅

## 📋 Implementação

### 1. Cálculo de Horas Trabalhadas

**Jornada integral (4 batidas)**:
- Manhã: `saida_almoco - entrada_manha`
- Tarde: `saida_tarde - entrada_tarde`
- Total: `manhã + tarde`

**Jornada parcial (2 batidas)**:
- Total: `saida - entrada`

**Precisão**: Calculado em **segundos** e convertido para minutos (floor) ao final

### 2. Cálculo de Horas Previstas

Derivado da escala do dia:
- Se trabalha manhã: `saida_manha_prevista - entrada_manha_prevista`
- Se trabalha tarde: `saida_tarde_prevista - entrada_tarde_prevista`
- Total: `prev_manha + prev_tarde`

### 3. Saldo

```
saldo_minutes = worked_minutes - expected_minutes
```

Exibição:
- `saldo > 0` → "Xmin +"
- `saldo < 0` → "Xmin -"
- `saldo = 0` → "0min"

### 4. Indicadores Informativos

**NÃO determinam o saldo**, são apenas informativos:
- **Atraso**: primeira entrada vs entrada prevista
- **Chegada antecipada**: primeira entrada vs entrada prevista
- **Hora extra**: última saída vs saída prevista
- **Saída antecipada**: última saída vs saída prevista

### 5. Intervalo do Almoço

**Não cria "hora extra" por sair pro almoço depois**

O almoço afeta o saldo pelo caminho correto:
- Se volta mais tarde → trabalha menos → horas trabalhadas caem → saldo negativo

**Indicador opcional** (alerta):
- `excesso_intervalo = max(0, intervalo_real - intervalo_previsto)`
- Exibido como alerta (não entra no saldo diretamente)

## 📊 Casos de Teste

### 8.1 Caso Dayana (08/12/14/18)
**Batidas**: 08:13 / 12:11 / 14:11 / 17:56

- **Horas trabalhadas**: (3:58) + (3:45) = 7:43 = 463 min ✅
- **Horas previstas**: 8:00 = 480 min ✅
- **Saldo**: 463 - 480 = **-17 min** ✅

**Explicação**: Ela atrasou 13 min na entrada e ainda trabalhou 4 min a menos na saída (17:56), então no total dá -17.

### 8.2 Atraso no almoço
**Escala**: 08:00-12:00 / 14:00-18:00  
**Batidas**: 08:00 / 12:00 / 14:15 / 18:00

- **Horas trabalhadas**: 4:00 + 3:45 = 7:45 = 465 min ✅
- **Horas previstas**: 8:00 = 480 min ✅
- **Saldo**: 465 - 480 = **-15 min** ✅

Mostra que "atrasar no almoço" vira saldo negativo automaticamente.

### 8.3 Saída antes
**Batidas**: 08:00 / 12:00 / 14:00 / 17:30

- **Horas trabalhadas**: 4:00 + 3:30 = 7:30 = 450 min ✅
- **Horas previstas**: 8:00 = 480 min ✅
- **Saldo**: 450 - 480 = **-30 min** ✅

### 8.4 Hora extra real
**Batidas**: 08:00 / 12:00 / 14:00 / 18:30

- **Horas trabalhadas**: 4:00 + 4:30 = 8:30 = 510 min ✅
- **Horas previstas**: 8:00 = 480 min ✅
- **Saldo**: 510 - 480 = **+30 min** ✅

### 8.5 Jornada 1 expediente (2 batidas)
**Escala**: 13:00-18:00 (5h)  
**Batidas**: 12:54 / 18:19

- **Horas trabalhadas**: 5:25 = 325 min ✅
- **Horas previstas**: 5:00 = 300 min ✅
- **Saldo**: 325 - 300 = **+25 min** ✅

## 🔧 Arquivos Modificados

1. **`lib/calculation-core-v2.ts`** - Nova função `computeDaySummaryV2`
2. **`lib/calculate.ts`** - Atualizado para usar V2
3. **`lib/db.ts`** - Adicionado campo `expected_minutes`
4. **`app/api/reports/route.ts`** - Incluído `expected_hours` na resposta
5. **`components/ReportsView.tsx`** - UI atualizada com:
   - Coluna "Horas Trabalhadas"
   - Coluna "Horas Previstas" (nova)
   - Coluna "Saldo" (trabalhadas - previstas)
   - Indicadores informativos (Atraso, Chegada Antecipada, Hora Extra)
6. **`lib/__tests__/calculation-core-v2.test.ts`** - Testes unitários completos

## 📝 Observação Importante

Com o modelo "saldo = horas trabalhadas − horas previstas", o saldo da Dayana no exemplo vira **-17 min**, e NÃO -13.

Porque:
- Ela trabalhou 7:43, mas o previsto é 8:00
- Isso é o modelo mais justo "de relógio" e resolve almoço/saída cedo automaticamente

## ✅ Status

- ✅ Cálculo implementado
- ✅ Testes passando (7 testes)
- ✅ UI atualizada
- ✅ Build funcionando
- ✅ Banco de dados atualizado

**Sistema pronto para uso!** 🎉


